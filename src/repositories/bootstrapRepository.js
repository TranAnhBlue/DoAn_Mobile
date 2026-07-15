import { executeQuery, transaction } from '../database/db';
import { syncRepository } from './syncRepository';

export const bootstrapRepository = {
  async applyServerChanges(serverData) {
    console.log('📥 Applying server changes...');
    
    await transaction(async () => {
      if (serverData.users) {
        await this.upsertUsers(serverData.users);
      }
      if (serverData.seasons) {
        await this.upsertSeasons(serverData.seasons);
      }
      if (serverData.phases) {
        await this.upsertPhases(serverData.phases);
      }
      if (serverData.technical_descriptions) {
        await this.upsertTechnicalDescriptions(serverData.technical_descriptions);
      }
      if (serverData.season_farmer_assignments) {
        await this.upsertSeasonFarmerAssignments(serverData.season_farmer_assignments);
      }
      if (serverData.farmer_daily_reports) {
        await this.upsertFarmerDailyReports(serverData.farmer_daily_reports);
      }
      if (serverData.field_diaries) {
        await this.upsertFieldDiaries(serverData.field_diaries);
      }
      if (serverData.phase_events) {
        await this.upsertPhaseEvents(serverData.phase_events);
      }
      
      if (serverData.cursors) {
        await this.updateCursors(serverData.cursors);
      }
    });
    
    console.log('✅ Server changes applied');
  },

  async upsertUsers(users) {
    for (const user of users) {
      await executeQuery(
        `INSERT OR REPLACE INTO users 
         (id, username, fullname, email, phone, avatar, role, roles, organization, province,
          sync_status, server_version, dirty_flag, updated_at, last_synced_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?, 0, ?, datetime('now'), ?)`,
        [
          user.id, user.username, user.fullname, user.email, user.phone,
          user.avatar, user.role, JSON.stringify(user.roles), user.organization, user.province,
          user.server_version || 1, user.updated_at, user.deleted_at
        ]
      );
    }
  },

  async upsertSeasons(seasons) {
    for (const season of seasons) {
      await executeQuery(
        `INSERT OR REPLACE INTO seasons 
         (id, name, crop_type, land_area, start_date, end_date, status, supervisor_id,
          sync_status, server_version, dirty_flag, updated_at, last_synced_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?, 0, ?, datetime('now'), ?)`,
        [
          season.id, season.name, season.crop_type, season.land_area,
          season.start_date, season.end_date, season.status, season.supervisor_id,
          season.server_version || 1, season.updated_at, season.deleted_at
        ]
      );
    }
  },

  async upsertPhases(phases) {
    for (const phase of phases) {
      await executeQuery(
        `INSERT OR REPLACE INTO phases 
         (id, season_id, name, description, phase_order, planned_start_date, planned_end_date,
          actual_start_date, actual_end_date, status, sync_status, server_version, dirty_flag,
          updated_at, last_synced_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?, 0, ?, datetime('now'), ?)`,
        [
          phase.id, phase.season_id, phase.name, phase.description, phase.phase_order,
          phase.planned_start_date, phase.planned_end_date, phase.actual_start_date,
          phase.actual_end_date, phase.status, phase.server_version || 1,
          phase.updated_at, phase.deleted_at
        ]
      );
    }
  },

  async upsertTechnicalDescriptions(descriptions) {
    for (const desc of descriptions) {
      await executeQuery(
        `INSERT OR REPLACE INTO technical_descriptions 
         (id, phase_id, work_description, materials_needed, estimated_duration,
          sync_status, server_version, dirty_flag, updated_at, last_synced_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, 'SYNCED', ?, 0, ?, datetime('now'), ?)`,
        [
          desc.id, desc.phase_id, desc.work_description, desc.materials_needed,
          desc.estimated_duration, desc.server_version || 1, desc.updated_at, desc.deleted_at
        ]
      );
    }
  },

  async upsertSeasonFarmerAssignments(assignments) {
    for (const assignment of assignments) {
      await executeQuery(
        `INSERT OR REPLACE INTO season_farmer_assignments 
         (id, season_id, farmer_id, assigned_at, sync_status, server_version, dirty_flag,
          updated_at, last_synced_at, deleted_at)
         VALUES (?, ?, ?, ?, 'SYNCED', ?, 0, ?, datetime('now'), ?)`,
        [
          assignment.id, assignment.season_id, assignment.farmer_id, assignment.assigned_at,
          assignment.server_version || 1, assignment.updated_at, assignment.deleted_at
        ]
      );
    }
  },

  async upsertFarmerDailyReports(reports) {
    for (const report of reports) {
      await executeQuery(
        `INSERT OR REPLACE INTO farmer_daily_reports 
         (id, farmer_id, phase_id, report_date, notes, status, sync_status, server_version,
          dirty_flag, updated_at, last_synced_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, 'SYNCED', ?, 0, ?, datetime('now'), ?)`,
        [
          report.id, report.farmer_id, report.phase_id, report.report_date,
          report.notes, report.status, report.server_version || 1,
          report.updated_at, report.deleted_at
        ]
      );
    }
  },

  async upsertFieldDiaries(diaries) {
    for (const diary of diaries) {
      await executeQuery(
        `INSERT OR REPLACE INTO field_diaries 
         (id, supervisor_id, phase_id, diary_date, notes, weather_condition, sync_status,
          server_version, dirty_flag, updated_at, last_synced_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, 'SYNCED', ?, 0, ?, datetime('now'), ?)`,
        [
          diary.id, diary.supervisor_id, diary.phase_id, diary.diary_date,
          diary.notes, diary.weather_condition, diary.server_version || 1,
          diary.updated_at, diary.deleted_at
        ]
      );
    }
  },

  async upsertPhaseEvents(events) {
    for (const event of events) {
      await executeQuery(
        `INSERT OR REPLACE INTO phase_events 
         (id, phase_id, event_type, event_date, notes, sync_status, server_version,
          dirty_flag, updated_at, last_synced_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, 'SYNCED', ?, 0, ?, datetime('now'), ?)`,
        [
          event.id, event.phase_id, event.event_type, event.event_date,
          event.notes, event.server_version || 1, event.updated_at, event.deleted_at
        ]
      );
    }
  },

  async updateCursors(cursors) {
    for (const [entity, timestamp] of Object.entries(cursors)) {
      await syncRepository.updateSyncCursor(entity, timestamp);
    }
  },
};
