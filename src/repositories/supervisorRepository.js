import { executeQuery, transaction } from '../database/db';
import { syncRepository } from './syncRepository';
import uuid from 'react-native-uuid';

export const supervisorRepository = {
  async getSupervisorSeasons(supervisorId) {
    const result = await executeQuery(
      `SELECT 
         s.id,
         s.name,
         s.crop_type,
         s.land_area,
         s.start_date,
         s.end_date,
         s.status,
         COUNT(DISTINCT p.id) as total_phases,
         COUNT(DISTINCT CASE WHEN p.status = 'COMPLETED' THEN p.id END) as completed_phases,
         COUNT(DISTINCT sfa.farmer_id) as assigned_farmers,
         COUNT(DISTINCT CASE WHEN fdr.status = 'SUBMITTED' THEN fdr.id END) as pending_reports
       FROM seasons s
       LEFT JOIN phases p ON s.id = p.season_id AND p.deleted_at IS NULL
       LEFT JOIN season_farmer_assignments sfa ON s.id = sfa.season_id AND sfa.deleted_at IS NULL
       LEFT JOIN farmer_daily_reports fdr ON p.id = fdr.phase_id AND fdr.deleted_at IS NULL
       WHERE s.supervisor_id = ?
         AND s.deleted_at IS NULL
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [supervisorId]
    );

    return result.rows?._array || [];
  },

  async getSeasonPhases(seasonId) {
    const result = await executeQuery(
      `SELECT 
         p.id,
         p.name,
         p.description,
         p.phase_order,
         p.planned_start_date,
         p.planned_end_date,
         p.actual_start_date,
         p.actual_end_date,
         p.status,
         td.work_description,
         td.materials_needed,
         td.estimated_duration
       FROM phases p
       LEFT JOIN technical_descriptions td ON p.id = td.phase_id AND td.deleted_at IS NULL
       WHERE p.season_id = ?
         AND p.deleted_at IS NULL
       ORDER BY p.phase_order ASC`,
      [seasonId]
    );

    return result.rows?._array || [];
  },

  async startPhase(phaseId, actualStartDate) {
    const eventId = uuid.v4();
    const now = new Date().toISOString();

    return await transaction(async () => {
      await executeQuery(
        `UPDATE phases 
         SET status = 'IN_PROGRESS', 
             actual_start_date = ?,
             dirty_flag = 1,
             updated_at = ?
         WHERE id = ?`,
        [actualStartDate, now, phaseId]
      );

      await executeQuery(
        `INSERT INTO phase_events 
         (id, phase_id, event_type, event_date, notes, sync_status, dirty_flag, created_at)
         VALUES (?, ?, 'START', ?, 'Phase started', 'PENDING', 1, ?)`,
        [eventId, phaseId, actualStartDate, now]
      );

      await syncRepository.addToSyncQueue(
        'phase',
        'UPDATE',
        phaseId,
        {
          status: 'IN_PROGRESS',
          actual_start_date: actualStartDate,
        }
      );

      console.log('✅ Phase started (offline):', phaseId);
      return phaseId;
    });
  },

  async completePhase(phaseId, actualEndDate) {
    const eventId = uuid.v4();
    const now = new Date().toISOString();

    return await transaction(async () => {
      await executeQuery(
        `UPDATE phases 
         SET status = 'COMPLETED', 
             actual_end_date = ?,
             dirty_flag = 1,
             updated_at = ?
         WHERE id = ?`,
        [actualEndDate, now, phaseId]
      );

      await executeQuery(
        `INSERT INTO phase_events 
         (id, phase_id, event_type, event_date, notes, sync_status, dirty_flag, created_at)
         VALUES (?, ?, 'COMPLETE', ?, 'Phase completed', 'PENDING', 1, ?)`,
        [eventId, phaseId, actualEndDate, now]
      );

      await syncRepository.addToSyncQueue(
        'phase',
        'UPDATE',
        phaseId,
        {
          status: 'COMPLETED',
          actual_end_date: actualEndDate,
        }
      );

      console.log('✅ Phase completed (offline):', phaseId);
      return phaseId;
    });
  },

  async createFieldDiary(supervisorId, phaseId, data) {
    const diaryId = uuid.v4();
    const now = new Date().toISOString();

    return await transaction(async () => {
      await executeQuery(
        `INSERT INTO field_diaries 
         (id, supervisor_id, phase_id, diary_date, notes, weather_condition, sync_status, dirty_flag, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 1, ?, ?)`,
        [
          diaryId,
          supervisorId,
          phaseId,
          data.diary_date || now,
          data.notes || '',
          data.weather_condition || '',
          now,
          now,
        ]
      );

      await syncRepository.addToSyncQueue(
        'field_diary',
        'CREATE',
        diaryId,
        {
          supervisor_id: supervisorId,
          phase_id: phaseId,
          diary_date: data.diary_date || now,
          notes: data.notes || '',
          weather_condition: data.weather_condition || '',
        }
      );

      if (data.images && data.images.length > 0) {
        for (const image of data.images) {
          const mediaId = uuid.v4();
          await executeQuery(
            `INSERT INTO media_files 
             (id, entity_type, entity_id, file_uri, file_type, upload_status, sync_status, created_at)
             VALUES (?, 'field_diary', ?, ?, 'image', 'PENDING', 'PENDING', ?)`,
            [mediaId, diaryId, image.uri, now]
          );
        }
      }

      console.log('✅ Field diary created (offline):', diaryId);
      return diaryId;
    });
  },

  async getPendingReports(supervisorId) {
    const result = await executeQuery(
      `SELECT 
         fdr.id,
         fdr.report_date,
         fdr.notes,
         fdr.status,
         fdr.created_at,
         u.fullname as farmer_name,
         u.phone as farmer_phone,
         p.name as phase_name,
         s.name as season_name
       FROM farmer_daily_reports fdr
       INNER JOIN users u ON fdr.farmer_id = u.id
       INNER JOIN phases p ON fdr.phase_id = p.id
       INNER JOIN seasons s ON p.season_id = s.id
       WHERE s.supervisor_id = ?
         AND fdr.status = 'SUBMITTED'
         AND fdr.deleted_at IS NULL
       ORDER BY fdr.created_at DESC`,
      [supervisorId]
    );

    return result.rows?._array || [];
  },

  async approveReport(reportId) {
    const now = new Date().toISOString();

    return await transaction(async () => {
      await executeQuery(
        `UPDATE farmer_daily_reports 
         SET status = 'APPROVED', 
             dirty_flag = 1,
             updated_at = ?
         WHERE id = ?`,
        [now, reportId]
      );

      await syncRepository.addToSyncQueue(
        'farmer_daily_report',
        'UPDATE',
        reportId,
        { status: 'APPROVED' }
      );

      console.log('✅ Report approved (offline):', reportId);
      return reportId;
    });
  },

  async rejectReport(reportId, reason) {
    const now = new Date().toISOString();

    return await transaction(async () => {
      await executeQuery(
        `UPDATE farmer_daily_reports 
         SET status = 'REJECTED', 
             notes = notes || '\n[Từ chối: ' || ? || ']',
             dirty_flag = 1,
             updated_at = ?
         WHERE id = ?`,
        [reason, now, reportId]
      );

      await syncRepository.addToSyncQueue(
        'farmer_daily_report',
        'UPDATE',
        reportId,
        { status: 'REJECTED', rejection_reason: reason }
      );

      console.log('✅ Report rejected (offline):', reportId);
      return reportId;
    });
  },

  async getFieldDiaries(phaseId, limit = 20) {
    const result = await executeQuery(
      `SELECT 
         fd.id,
         fd.diary_date,
         fd.notes,
         fd.weather_condition,
         fd.sync_status,
         fd.created_at,
         u.fullname as supervisor_name,
         COUNT(mf.id) as image_count
       FROM field_diaries fd
       INNER JOIN users u ON fd.supervisor_id = u.id
       LEFT JOIN media_files mf ON fd.id = mf.entity_id AND mf.entity_type = 'field_diary'
       WHERE fd.phase_id = ?
         AND fd.deleted_at IS NULL
       GROUP BY fd.id
       ORDER BY fd.diary_date DESC, fd.created_at DESC
       LIMIT ?`,
      [phaseId, limit]
    );

    return result.rows?._array || [];
  },
};
