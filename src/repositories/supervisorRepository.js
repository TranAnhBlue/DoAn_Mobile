import { execute, executeTransaction, rowsToArray } from '../database/db'
import { createUuid } from '../utils/uuid'

const todayDate = () => new Date().toISOString().slice(0, 10)
const nowIso = () => new Date().toISOString()

const mapSeason = (row) => ({
  id: row.id,
  name: row.name,
  crop: row.crop,
  areaName: row.area_name,
  status: row.status,
  currentPhaseId: row.current_phase_id,
  currentPhaseTitle: row.current_phase_title,
  pendingReports: row.pending_reports || 0,
})

const mapPhase = (row) => ({
  id: row.id,
  seasonId: row.season_id,
  phaseOrder: row.phase_order,
  title: row.title,
  status: row.status,
  dateFrom: row.date_from,
  dateTo: row.date_to,
  technicalDescription: row.technical_description,
})

const mapDiary = (row) => ({
  id: row.id,
  seasonId: row.season_id,
  phaseId: row.phase_id,
  logDate: row.log_date,
  taskCode: row.task_code,
  content: row.content,
  issueLevel: row.issue_level,
  syncStatus: row.sync_status,
  mediaCount: row.media_count || 0,
})

export const getSupervisorSeasons = async (supervisorId) => {
  const result = await execute(
    `SELECT
      s.id,
      s.name,
      s.crop,
      s.area_name,
      s.status,
      cp.id AS current_phase_id,
      cp.title AS current_phase_title,
      COUNT(r.id) AS pending_reports
    FROM seasons s
    LEFT JOIN phases cp ON cp.season_id = s.id AND cp.status = 'IN_PROGRESS' AND cp.deleted_at IS NULL
    LEFT JOIN farmer_daily_reports r ON r.season_id = s.id AND r.sync_status IN ('PENDING', 'SYNCED') AND r.deleted_at IS NULL
    WHERE s.supervisor_id = ? AND s.deleted_at IS NULL
    GROUP BY s.id
    ORDER BY s.start_date DESC`,
    [supervisorId],
  )

  return rowsToArray(result).map(mapSeason)
}

export const getSeasonPhases = async (seasonId) => {
  const result = await execute(
    `SELECT
      p.id,
      p.season_id,
      p.phase_order,
      p.title,
      p.status,
      p.date_from,
      p.date_to,
      td.content AS technical_description
    FROM phases p
    LEFT JOIN technical_descriptions td ON td.phase_id = p.id AND td.is_active = 1 AND td.deleted_at IS NULL
    WHERE p.season_id = ? AND p.deleted_at IS NULL
    ORDER BY p.phase_order ASC`,
    [seasonId],
  )

  return rowsToArray(result).map(mapPhase)
}

export const getPhaseDiaries = async (phaseId) => {
  const result = await execute(
    `SELECT
      d.id,
      d.season_id,
      d.phase_id,
      d.log_date,
      d.task_code,
      d.content,
      d.issue_level,
      d.sync_status,
      COUNT(m.id) AS media_count
    FROM field_diaries d
    LEFT JOIN media_files m ON m.owner_type = 'FIELD_DIARY' AND m.owner_id = d.id AND m.deleted_at IS NULL
    WHERE d.phase_id = ? AND d.deleted_at IS NULL
    GROUP BY d.id
    ORDER BY d.client_created_at DESC`,
    [phaseId],
  )

  return rowsToArray(result).map(mapDiary)
}

export const startPhase = async ({ supervisorId, seasonId, phaseId }) => {
  const eventId = createUuid()
  const queueId = createUuid()
  const occurredAt = nowIso()
  const payload = {
    clientOperationId: queueId,
    operation: 'PHASE_EVENT',
    entityType: 'PHASE_EVENT',
    entityId: eventId,
    baseServerVersion: 0,
    occurredAt,
    payload: {
      id: eventId,
      seasonId,
      phaseId,
      actorId: supervisorId,
      eventType: 'PHASE_STARTED',
      eventAt: occurredAt,
      note: null,
    },
  }

  await executeTransaction((tx) => {
    tx.executeSql(
      `INSERT INTO phase_events (
        id,
        season_id,
        phase_id,
        actor_id,
        event_type,
        event_at,
        sync_status,
        dirty_flag,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 'PHASE_STARTED', ?, 'PENDING', 1, ?, ?)`,
      [eventId, seasonId, phaseId, supervisorId, occurredAt, occurredAt, occurredAt],
    )

    tx.executeSql(
      `UPDATE phases
      SET status = 'IN_PROGRESS', started_at = COALESCE(started_at, ?), started_by = COALESCE(started_by, ?), dirty_flag = 1, updated_at = ?
      WHERE id = ?`,
      [occurredAt, supervisorId, occurredAt, phaseId],
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
      ) VALUES (?, 'PHASE_EVENT', 'PHASE_EVENT', ?, ?, 'PENDING', 0, 5, ?, ?)`,
      [queueId, eventId, JSON.stringify(payload), occurredAt, occurredAt],
    )
  })
}

export const createFieldDiary = async ({ supervisorId, seasonId, phaseId, taskCode, content, imageAssets }) => {
  const diaryId = createUuid()
  const diaryQueueId = createUuid()
  const occurredAt = nowIso()
  const logDate = todayDate()
  const normalizedImages = imageAssets.slice(0, 2)
  const diaryPayload = {
    clientOperationId: diaryQueueId,
    operation: 'CREATE',
    entityType: 'FIELD_DIARY',
    entityId: diaryId,
    baseServerVersion: 0,
    occurredAt,
    payload: {
      id: diaryId,
      seasonId,
      phaseId,
      supervisorId,
      logDate,
      taskCode: taskCode?.trim() || null,
      content: content.trim(),
      weather: null,
      plantCondition: null,
      soilCondition: null,
      issueLevel: 'NONE',
      clientCreatedAt: occurredAt,
    },
  }

  await executeTransaction((tx) => {
    tx.executeSql(
      `INSERT INTO field_diaries (
        id,
        season_id,
        phase_id,
        supervisor_id,
        log_date,
        task_code,
        content,
        issue_level,
        client_created_at,
        sync_status,
        dirty_flag,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'NONE', ?, 'PENDING', 1, ?, ?)`,
      [
        diaryId,
        seasonId,
        phaseId,
        supervisorId,
        logDate,
        taskCode?.trim() || null,
        content.trim(),
        occurredAt,
        occurredAt,
        occurredAt,
      ],
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
      ) VALUES (?, 'CREATE', 'FIELD_DIARY', ?, ?, 'PENDING', 0, 5, ?, ?)`,
      [diaryQueueId, diaryId, JSON.stringify(diaryPayload), occurredAt, occurredAt],
    )

    normalizedImages.forEach((asset, index) => {
      const mediaId = createUuid()
      const mediaQueueId = createUuid()
      const mediaPayload = {
        clientOperationId: mediaQueueId,
        operation: 'UPLOAD_MEDIA',
        entityType: 'MEDIA_FILE',
        entityId: mediaId,
        baseServerVersion: 0,
        occurredAt,
        payload: {
          id: mediaId,
          ownerType: 'FIELD_DIARY',
          ownerId: diaryId,
          mediaType: 'IMAGE',
          localUri: asset.uri,
          fileName: asset.fileName || `field-diary-${index + 1}.jpg`,
          mimeType: asset.type || 'image/jpeg',
          fileSize: asset.fileSize || null,
          width: asset.width || null,
          height: asset.height || null,
          caption: `Anh thuc dia ${index + 1}`,
          takenAt: occurredAt,
        },
      }

      tx.executeSql(
        `INSERT INTO media_files (
          id,
          owner_type,
          owner_id,
          media_type,
          local_uri,
          file_name,
          mime_type,
          file_size,
          width,
          height,
          caption,
          taken_at,
          upload_status,
          dirty_flag,
          created_at,
          updated_at
        ) VALUES (?, 'FIELD_DIARY', ?, 'IMAGE', ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 1, ?, ?)`,
        [
          mediaId,
          diaryId,
          asset.uri,
          asset.fileName || `field-diary-${index + 1}.jpg`,
          asset.type || 'image/jpeg',
          asset.fileSize || null,
          asset.width || null,
          asset.height || null,
          `Anh thuc dia ${index + 1}`,
          occurredAt,
          occurredAt,
          occurredAt,
        ],
      )

      tx.executeSql(
        `INSERT INTO sync_queue (
          id,
          operation_type,
          entity_type,
          entity_id,
          payload_json,
          dependency_queue_id,
          status,
          retry_count,
          max_retry,
          created_at,
          updated_at
        ) VALUES (?, 'UPLOAD_MEDIA', 'MEDIA_FILE', ?, ?, ?, 'PENDING', 0, 5, ?, ?)`,
        [mediaQueueId, mediaId, JSON.stringify(mediaPayload), diaryQueueId, occurredAt, occurredAt],
      )
    })
  })

  return { diaryId }
}
