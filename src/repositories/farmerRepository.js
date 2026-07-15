import { executeQuery, transaction } from '../database/db';
import { syncRepository } from './syncRepository';
import uuid from 'react-native-uuid';

export const farmerRepository = {
  async getCurrentFarmerPhase(farmerId) {
    const result = await executeQuery(
      `SELECT 
         p.id as phase_id,
         p.name as phase_name,
         p.description as phase_description,
         p.status as phase_status,
         p.actual_start_date,
         p.actual_end_date,
         s.id as season_id,
         s.name as season_name,
         s.crop_type,
         td.work_description,
         td.materials_needed,
         td.estimated_duration
       FROM season_farmer_assignments sfa
       INNER JOIN seasons s ON sfa.season_id = s.id
       INNER JOIN phases p ON s.id = p.season_id
       LEFT JOIN technical_descriptions td ON p.id = td.phase_id
       WHERE sfa.farmer_id = ?
         AND s.status = 'ACTIVE'
         AND p.status = 'IN_PROGRESS'
         AND sfa.deleted_at IS NULL
         AND s.deleted_at IS NULL
         AND p.deleted_at IS NULL
       ORDER BY p.phase_order ASC
       LIMIT 1`,
      [farmerId]
    );

    return result.rows?._array?.[0] || null;
  },

  async getAssignedSeasons(farmerId) {
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
         COUNT(DISTINCT CASE WHEN p.status = 'COMPLETED' THEN p.id END) as completed_phases
       FROM season_farmer_assignments sfa
       INNER JOIN seasons s ON sfa.season_id = s.id
       LEFT JOIN phases p ON s.id = p.season_id AND p.deleted_at IS NULL
       WHERE sfa.farmer_id = ?
         AND sfa.deleted_at IS NULL
         AND s.deleted_at IS NULL
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [farmerId]
    );

    return result.rows?._array || [];
  },

  async getPendingReports(farmerId) {
    const result = await executeQuery(
      `SELECT 
         fdr.id,
         fdr.report_date,
         fdr.notes,
         fdr.status,
         fdr.sync_status,
         p.name as phase_name,
         s.name as season_name
       FROM farmer_daily_reports fdr
       INNER JOIN phases p ON fdr.phase_id = p.id
       INNER JOIN seasons s ON p.season_id = s.id
       WHERE fdr.farmer_id = ?
         AND fdr.sync_status = 'PENDING'
         AND fdr.deleted_at IS NULL
       ORDER BY fdr.created_at DESC`,
      [farmerId]
    );

    return result.rows?._array || [];
  },

  async createDailyReport(farmerId, phaseId, data) {
    const reportId = uuid.v4();
    const now = new Date().toISOString();

    return await transaction(async () => {
      await executeQuery(
        `INSERT INTO farmer_daily_reports 
         (id, farmer_id, phase_id, report_date, notes, status, sync_status, dirty_flag, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'SUBMITTED', 'PENDING', 1, ?, ?)`,
        [reportId, farmerId, phaseId, data.report_date || now, data.notes || '', now, now]
      );

      await syncRepository.addToSyncQueue(
        'farmer_daily_report',
        'CREATE',
        reportId,
        {
          farmer_id: farmerId,
          phase_id: phaseId,
          report_date: data.report_date || now,
          notes: data.notes || '',
          status: 'SUBMITTED',
        }
      );

      console.log('✅ Daily report created (offline):', reportId);
      return reportId;
    });
  },

  async getReportHistory(farmerId, limit = 20) {
    const result = await executeQuery(
      `SELECT 
         fdr.id,
         fdr.report_date,
         fdr.notes,
         fdr.status,
         fdr.sync_status,
         fdr.created_at,
         p.name as phase_name,
         s.name as season_name
       FROM farmer_daily_reports fdr
       INNER JOIN phases p ON fdr.phase_id = p.id
       INNER JOIN seasons s ON p.season_id = s.id
       WHERE fdr.farmer_id = ?
         AND fdr.deleted_at IS NULL
       ORDER BY fdr.report_date DESC, fdr.created_at DESC
       LIMIT ?`,
      [farmerId, limit]
    );

    return result.rows?._array || [];
  },
};
