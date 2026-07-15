import { execute, executeTransaction, rowsToArray } from '../database/db'

export const getSyncCursor = async () => {
  const result = await execute('SELECT value FROM sync_state WHERE key = ?', ['last_delta_cursor'])
  return rowsToArray(result)[0]?.value || null
}

export const setSyncCursor = async (cursor) => {
  if (!cursor) return
  const now = new Date().toISOString()
  await execute(
    `INSERT OR REPLACE INTO sync_state (key, value, updated_at) VALUES ('last_delta_cursor', ?, ?)`,
    [cursor, now],
  )
}

export const getPendingOperations = async (limit = 25) => {
  const result = await execute(
    `SELECT * FROM sync_queue
    WHERE status = 'PENDING'
      AND (dependency_queue_id IS NULL OR dependency_queue_id IN (SELECT id FROM sync_queue WHERE status = 'SYNCED'))
    ORDER BY created_at ASC
    LIMIT ?`,
    [limit],
  )

  return rowsToArray(result).map((row) => ({
    id: row.id,
    operationType: row.operation_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    payload: JSON.parse(row.payload_json),
  }))
}

export const markOperationsProcessing = async (queueIds) => {
  if (queueIds.length === 0) return
  const now = new Date().toISOString()
  await executeTransaction((tx) => {
    queueIds.forEach((id) => {
      tx.executeSql('UPDATE sync_queue SET status = ?, updated_at = ? WHERE id = ?', ['PROCESSING', now, id])
    })
  })
}

const updateEntitySyncSuccess = (tx, entityType, entityId, serverVersion, serverReceivedAt) => {
  const syncedAt = serverReceivedAt || new Date().toISOString()
  if (entityType === 'FARMER_DAILY_REPORT') {
    tx.executeSql(
      `UPDATE farmer_daily_reports SET sync_status = 'SYNCED', dirty_flag = 0, server_version = ?, server_received_at = ?, last_synced_at = ?, updated_at = ? WHERE id = ?`,
      [serverVersion || 1, syncedAt, syncedAt, syncedAt, entityId],
    )
  }

  if (entityType === 'FIELD_DIARY') {
    tx.executeSql(
      `UPDATE field_diaries SET sync_status = 'SYNCED', dirty_flag = 0, server_version = ?, server_received_at = ?, last_synced_at = ?, updated_at = ? WHERE id = ?`,
      [serverVersion || 1, syncedAt, syncedAt, syncedAt, entityId],
    )
  }

  if (entityType === 'PHASE_EVENT') {
    tx.executeSql(
      `UPDATE phase_events SET sync_status = 'SYNCED', dirty_flag = 0, last_synced_at = ?, updated_at = ? WHERE id = ?`,
      [syncedAt, syncedAt, entityId],
    )
  }
}

export const applySyncResults = async (results) => {
  const now = new Date().toISOString()
  await executeTransaction((tx) => {
    results.forEach((result) => {
      if (result.status === 'SYNCED' || result.status === 'SYNCED_DUPLICATE') {
        tx.executeSql(
          `UPDATE sync_queue SET status = 'SYNCED', synced_at = ?, updated_at = ?, last_error = NULL WHERE id = ?`,
          [result.serverReceivedAt || now, now, result.clientOperationId],
        )
        updateEntitySyncSuccess(tx, result.entityType, result.entityId, result.serverVersion, result.serverReceivedAt)
      } else if (result.status === 'PENDING_UPLOAD') {
        tx.executeSql(
          `UPDATE sync_queue SET status = 'SYNCED', synced_at = ?, updated_at = ?, last_error = NULL WHERE id = ?`,
          [result.serverReceivedAt || now, now, result.clientOperationId],
        )
      } else {
        tx.executeSql(
          `UPDATE sync_queue
          SET status = 'FAILED', retry_count = retry_count + 1, last_error = ?, updated_at = ?
          WHERE id = ?`,
          [result.error?.message || 'Sync failed', now, result.clientOperationId],
        )
      }
    })
  })
}

export const resetProcessingToPending = async () => {
  const now = new Date().toISOString()
  await execute('UPDATE sync_queue SET status = ?, updated_at = ? WHERE status = ?', ['PENDING', now, 'PROCESSING'])
}

export const getPendingMediaUploads = async (limit = 5) => {
  const result = await execute(
    `SELECT * FROM media_files WHERE upload_status = 'PENDING' AND deleted_at IS NULL ORDER BY created_at ASC LIMIT ?`,
    [limit],
  )
  return rowsToArray(result).map((row) => ({
    id: row.id,
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    localUri: row.local_uri,
    fileName: row.file_name,
    mimeType: row.mime_type,
    caption: row.caption,
    takenAt: row.taken_at,
  }))
}

export const markMediaUploaded = async (mediaId, remoteUrl) => {
  const now = new Date().toISOString()
  await execute(
    `UPDATE media_files SET upload_status = 'UPLOADED', remote_url = ?, dirty_flag = 0, last_synced_at = ?, updated_at = ? WHERE id = ?`,
    [remoteUrl, now, now, mediaId],
  )
}

export const markMediaUploadFailed = async (mediaId) => {
  const now = new Date().toISOString()
  await execute(`UPDATE media_files SET upload_status = 'FAILED', updated_at = ? WHERE id = ?`, [now, mediaId])
}
