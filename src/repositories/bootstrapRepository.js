import { executeTransaction } from '../database/db'
import { setSyncCursor } from './syncRepository'

const boolToInt = (value) => (value ? 1 : 0)

export const applyServerChanges = async (changes) => {
  if (!changes) return

  await executeTransaction((tx) => {
    ;(changes.users || []).forEach((item) => {
      tx.executeSql(
        `INSERT OR REPLACE INTO users (
          id,
          full_name,
          phone,
          role,
          farm_id,
          created_at,
          updated_at,
          last_synced_at
        ) VALUES (?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM users WHERE id = ?), ?), ?, ?)`,
        [
          item.id,
          item.fullName,
          item.phone || null,
          item.role,
          item.farmId || null,
          item.id,
          item.updatedAt,
          item.updatedAt,
          item.updatedAt,
        ],
      )
    })

    ;(changes.seasons || []).forEach((item) => {
      tx.executeSql(
        `INSERT OR REPLACE INTO seasons (
          id,
          name,
          crop,
          category,
          specific_crop,
          area_name,
          area_id,
          supervisor_id,
          start_date,
          expected_start_date,
          status,
          is_planned,
          server_version,
          deleted_at,
          created_at,
          updated_at,
          last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.name,
          item.crop || null,
          item.category || null,
          item.specificCrop || null,
          item.areaName || null,
          item.areaId || null,
          item.supervisorId || null,
          item.startDate || null,
          item.expectedStartDate || null,
          item.status || 'ACTIVE',
          boolToInt(item.isPlanned),
          item.serverVersion || 0,
          item.deletedAt || null,
          item.createdAt,
          item.updatedAt,
          item.updatedAt,
        ],
      )
    })

    ;(changes.phases || []).forEach((item) => {
      tx.executeSql(
        `INSERT OR REPLACE INTO phases (
          id,
          season_id,
          phase_order,
          title,
          status,
          date_from,
          date_to,
          started_at,
          completed_at,
          started_by,
          completed_by,
          server_version,
          deleted_at,
          created_at,
          updated_at,
          last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.seasonId,
          item.phaseOrder,
          item.title,
          item.status,
          item.dateFrom || null,
          item.dateTo || null,
          item.startedAt || null,
          item.completedAt || null,
          item.startedBy || null,
          item.completedBy || null,
          item.serverVersion || 0,
          item.deletedAt || null,
          item.createdAt,
          item.updatedAt,
          item.updatedAt,
        ],
      )
    })

    ;(changes.technicalDescriptions || []).forEach((item) => {
      tx.executeSql(
        `INSERT OR REPLACE INTO technical_descriptions (
          id,
          phase_id,
          title,
          content,
          language,
          version,
          is_active,
          server_version,
          deleted_at,
          created_at,
          updated_at,
          last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.phaseId,
          item.title || null,
          item.content,
          item.language || 'vi',
          item.version || 1,
          boolToInt(item.isActive),
          item.serverVersion || 0,
          item.deletedAt || null,
          item.createdAt,
          item.updatedAt,
          item.updatedAt,
        ],
      )
    })

    ;(changes.assignments || []).forEach((item) => {
      tx.executeSql(
        `INSERT OR REPLACE INTO season_farmer_assignments (
          id,
          season_id,
          farmer_id,
          assigned_by,
          assigned_at,
          status,
          deleted_at,
          created_at,
          updated_at,
          last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.seasonId,
          item.farmerId,
          item.assignedBy,
          item.assignedAt,
          item.status || 'ACTIVE',
          item.deletedAt || null,
          item.createdAt,
          item.updatedAt,
          item.updatedAt,
        ],
      )
    })

    ;(changes.farmerDailyReports || []).forEach((item) => {
      tx.executeSql(
        `INSERT OR REPLACE INTO farmer_daily_reports (
          id,
          season_id,
          phase_id,
          farmer_id,
          report_date,
          status,
          note,
          client_created_at,
          server_received_at,
          sync_status,
          server_version,
          dirty_flag,
          deleted_at,
          created_at,
          updated_at,
          last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?, 0, ?, ?, ?, ?)`,
        [
          item.id,
          item.seasonId,
          item.phaseId,
          item.farmerId,
          item.reportDate,
          item.status,
          item.note || null,
          item.clientCreatedAt,
          item.serverReceivedAt || null,
          item.serverVersion || 0,
          item.deletedAt || null,
          item.createdAt,
          item.updatedAt,
          item.updatedAt,
        ],
      )
    })

    ;(changes.fieldDiaries || []).forEach((item) => {
      tx.executeSql(
        `INSERT OR REPLACE INTO field_diaries (
          id,
          season_id,
          phase_id,
          supervisor_id,
          log_date,
          task_code,
          content,
          weather,
          plant_condition,
          soil_condition,
          issue_level,
          client_created_at,
          server_received_at,
          sync_status,
          server_version,
          dirty_flag,
          deleted_at,
          created_at,
          updated_at,
          last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?, 0, ?, ?, ?, ?)`,
        [
          item.id,
          item.seasonId,
          item.phaseId,
          item.supervisorId,
          item.logDate,
          item.taskCode || null,
          item.content,
          item.weather || null,
          item.plantCondition || null,
          item.soilCondition || null,
          item.issueLevel || 'NONE',
          item.clientCreatedAt,
          item.serverReceivedAt || null,
          item.serverVersion || 0,
          item.deletedAt || null,
          item.createdAt,
          item.updatedAt,
          item.updatedAt,
        ],
      )
    })

    ;(changes.mediaFiles || []).forEach((item) => {
      tx.executeSql(
        `INSERT OR REPLACE INTO media_files (
          id,
          owner_type,
          owner_id,
          media_type,
          local_uri,
          remote_url,
          file_name,
          mime_type,
          file_size,
          width,
          height,
          caption,
          taken_at,
          upload_status,
          dirty_flag,
          deleted_at,
          created_at,
          updated_at,
          last_synced_at
        ) VALUES (?, ?, ?, ?, COALESCE((SELECT local_uri FROM media_files WHERE id = ?), ''), ?, ?, ?, ?, ?, ?, ?, ?, 'UPLOADED', 0, ?, ?, ?, ?)`,
        [
          item.id,
          item.ownerType,
          item.ownerId,
          item.mediaType,
          item.id,
          item.remoteUrl || null,
          item.fileName || null,
          item.mimeType || null,
          item.fileSize || null,
          item.width || null,
          item.height || null,
          item.caption || null,
          item.takenAt || null,
          item.deletedAt || null,
          item.createdAt,
          item.updatedAt,
          item.updatedAt,
        ],
      )
    })
  })

  await setSyncCursor(changes.cursor)
}
