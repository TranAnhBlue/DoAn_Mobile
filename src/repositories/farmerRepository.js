import { execute, executeTransaction, rowsToArray } from '../database/db'
import { createUuid } from '../utils/uuid'

const todayDate = () => new Date().toISOString().slice(0, 10)
const nowIso = () => new Date().toISOString()

const normalizePhase = (row) => {
  if (!row) return null

  return {
    seasonId: row.season_id,
    seasonName: row.season_name,
    crop: row.crop,
    areaName: row.area_name,
    phaseId: row.phase_id,
    phaseOrder: row.phase_order,
    title: row.phase_title,
    status: row.phase_status,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    technicalDescription: row.technical_description,
    reportId: row.report_id,
    reportSyncStatus: row.report_sync_status,
  }
}

export const getCurrentFarmerPhase = async (farmerId) => {
  const result = await execute(
    `SELECT
      s.id AS season_id,
      s.name AS season_name,
      s.crop,
      s.area_name,
      p.id AS phase_id,
      p.phase_order,
      p.title AS phase_title,
      p.status AS phase_status,
      p.date_from,
      p.date_to,
      td.content AS technical_description,
      r.id AS report_id,
      r.sync_status AS report_sync_status
    FROM season_farmer_assignments a
    INNER JOIN seasons s ON s.id = a.season_id AND s.deleted_at IS NULL
    INNER JOIN phases p ON p.season_id = s.id AND p.deleted_at IS NULL
    LEFT JOIN technical_descriptions td ON td.phase_id = p.id AND td.is_active = 1 AND td.deleted_at IS NULL
    LEFT JOIN farmer_daily_reports r
      ON r.phase_id = p.id
      AND r.farmer_id = a.farmer_id
      AND r.report_date = ?
      AND r.deleted_at IS NULL
    WHERE a.farmer_id = ?
      AND a.status = 'ACTIVE'
      AND a.deleted_at IS NULL
      AND p.status = 'IN_PROGRESS'
    ORDER BY s.start_date DESC, p.phase_order ASC
    LIMIT 1`,
    [todayDate(), farmerId],
  )

  return normalizePhase(rowsToArray(result)[0])
}

export const createFarmerDailyReport = async ({ farmerId, seasonId, phaseId }) => {
  const reportId = createUuid()
  const queueId = createUuid()
  const occurredAt = nowIso()
  const reportDate = todayDate()
  const payload = {
    clientOperationId: queueId,
    operation: 'CREATE',
    entityType: 'FARMER_DAILY_REPORT',
    entityId: reportId,
    baseServerVersion: 0,
    occurredAt,
    payload: {
      id: reportId,
      seasonId,
      phaseId,
      farmerId,
      reportDate,
      status: 'COMPLETED',
      note: null,
      clientCreatedAt: occurredAt,
    },
  }
  await executeTransaction((tx) => {
    tx.executeSql(
      `INSERT OR IGNORE INTO farmer_daily_reports (
        id,
        season_id,
        phase_id,
        farmer_id,
        report_date,
        status,
        note,
        client_created_at,
        sync_status,
        dirty_flag,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, 'COMPLETED', NULL, ?, 'PENDING', 1, ?, ?)`,
      [reportId, seasonId, phaseId, farmerId, reportDate, occurredAt, occurredAt, occurredAt],
    )

    tx.executeSql(
      `INSERT INTO sync_queue (
        id,
        operation_type,
        entity_type,
        entity_id,
        payload_json,
        status,
        retry_count,
        max_retry,
        created_at,
        updated_at
      ) VALUES (?, 'CREATE', 'FARMER_DAILY_REPORT', ?, ?, 'PENDING', 0, 5, ?, ?)`,
      [queueId, reportId, JSON.stringify(payload), occurredAt, occurredAt],
    )
  })

  return {
    reportId,
    queueId,
    reportDate,
    syncStatus: 'PENDING',
  }
}
