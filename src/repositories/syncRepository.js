import { executeQuery } from '../database/db';
import uuid from 'react-native-uuid';

export const syncRepository = {
  async getSyncCursors() {
    const result = await executeQuery(
      'SELECT key, value FROM sync_state WHERE key LIKE "cursor_%"'
    );
    
    const cursors = {};
    result.rows?._array?.forEach(row => {
      const entity = row.key.replace('cursor_', '');
      cursors[entity] = parseInt(row.value) || 0;
    });
    
    return cursors;
  },

  async updateSyncCursor(entity, timestamp) {
    await executeQuery(
      `INSERT OR REPLACE INTO sync_state (key, value, updated_at) 
       VALUES (?, ?, datetime('now'))`,
      [`cursor_${entity}`, timestamp.toString()]
    );
  },

  async getPendingOperations(limit = 25) {
    const result = await executeQuery(
      `SELECT * FROM sync_queue 
       WHERE sync_status = 'PENDING' 
         AND (depends_on IS NULL OR depends_on IN 
           (SELECT entity_id FROM sync_queue WHERE sync_status = 'SYNCED'))
         AND retry_count < max_retries
       ORDER BY priority DESC, created_at ASC
       LIMIT ?`,
      [limit]
    );
    
    return result.rows?._array?.map(row => ({
      id: row.id,
      entityType: row.entity_type,
      operation: row.operation,
      entityId: row.entity_id,
      data: row.data ? JSON.parse(row.data) : null,
      dependsOn: row.depends_on,
    })) || [];
  },

  async addToSyncQueue(entityType, operation, entityId, data, dependsOn = null) {
    const id = uuid.v4();
    
    await executeQuery(
      `INSERT INTO sync_queue (id, entity_type, operation, entity_id, data, depends_on, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, entityType, operation, entityId, JSON.stringify(data), dependsOn]
    );
    
    return id;
  },

  async updateSyncStatus(queueId, status, errorMessage = null) {
    if (status === 'SYNCED') {
      await executeQuery(
        `UPDATE sync_queue 
         SET sync_status = ?, synced_at = datetime('now')
         WHERE id = ?`,
        [status, queueId]
      );
    } else if (status === 'FAILED') {
      await executeQuery(
        `UPDATE sync_queue 
         SET sync_status = ?, retry_count = retry_count + 1, 
             error_message = ?, last_retry_at = datetime('now')
         WHERE id = ?`,
        [status, errorMessage, queueId]
      );
    } else {
      await executeQuery(
        `UPDATE sync_queue 
         SET sync_status = ?
         WHERE id = ?`,
        [status, queueId]
      );
    }
  },

  async updateSyncResults(results) {
    for (const result of results) {
      if (result.status === 'SUCCESS') {
        await this.updateSyncStatus(result.queue_id, 'SYNCED');
        
        if (result.entity_type && result.entity_id && result.server_version) {
          const tableName = this.getTableName(result.entity_type);
          await executeQuery(
            `UPDATE ${tableName} 
             SET sync_status = 'SYNCED', 
                 server_version = ?, 
                 dirty_flag = 0,
                 last_synced_at = datetime('now')
             WHERE id = ?`,
            [result.server_version, result.entity_id]
          );
        }
      } else {
        await this.updateSyncStatus(result.queue_id, 'FAILED', result.message);
      }
    }
  },

  async getPendingCount() {
    const result = await executeQuery(
      `SELECT COUNT(*) as count FROM sync_queue 
       WHERE sync_status = 'PENDING' AND retry_count < max_retries`
    );
    return result.rows?._array?.[0]?.count || 0;
  },

  async clearSyncedOperations(olderThanDays = 7) {
    await executeQuery(
      `DELETE FROM sync_queue 
       WHERE sync_status = 'SYNCED' 
         AND synced_at < datetime('now', '-' || ? || ' days')`,
      [olderThanDays]
    );
  },

  async resetFailedOperations() {
    await executeQuery(
      `UPDATE sync_queue 
       SET sync_status = 'PENDING', retry_count = 0, error_message = NULL
       WHERE sync_status = 'FAILED'`
    );
  },

  getTableName(entityType) {
    const mapping = {
      'user': 'users',
      'season': 'seasons',
      'phase': 'phases',
      'technical_description': 'technical_descriptions',
      'season_farmer_assignment': 'season_farmer_assignments',
      'farmer_daily_report': 'farmer_daily_reports',
      'field_diary': 'field_diaries',
      'phase_event': 'phase_events',
      'media_file': 'media_files',
    };
    return mapping[entityType] || entityType;
  },
};
