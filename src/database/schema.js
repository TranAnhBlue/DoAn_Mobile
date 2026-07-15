import { execute } from './db'

/**
 * Chỉ tạo table/index nếu chưa tồn tại.
 * Dùng CREATE TABLE IF NOT EXISTS và CREATE INDEX IF NOT EXISTS để idempotent.
 */
const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('FARMER', 'FARM_SUPERVISOR')),
    farm_id TEXT,
    access_token TEXT,
    refresh_token TEXT,
    last_login_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_synced_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS seasons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    crop TEXT,
    category TEXT,
    specific_crop TEXT,
    area_name TEXT,
    area_id TEXT,
    supervisor_id TEXT,
    start_date TEXT,
    expected_start_date TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    is_planned INTEGER NOT NULL DEFAULT 0,
    server_version INTEGER NOT NULL DEFAULT 0,
    dirty_flag INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_synced_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS phases (
    id TEXT PRIMARY KEY,
    season_id TEXT NOT NULL,
    phase_order INTEGER NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'DONE')),
    date_from TEXT,
    date_to TEXT,
    started_at TEXT,
    completed_at TEXT,
    started_by TEXT,
    completed_by TEXT,
    server_version INTEGER NOT NULL DEFAULT 0,
    dirty_flag INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_synced_at TEXT,
    FOREIGN KEY (season_id) REFERENCES seasons(id)
  )`,
  `CREATE TABLE IF NOT EXISTS technical_descriptions (
    id TEXT PRIMARY KEY,
    phase_id TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'vi',
    version INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    server_version INTEGER NOT NULL DEFAULT 0,
    dirty_flag INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_synced_at TEXT,
    FOREIGN KEY (phase_id) REFERENCES phases(id)
  )`,
  `CREATE TABLE IF NOT EXISTS season_farmer_assignments (
    id TEXT PRIMARY KEY,
    season_id TEXT NOT NULL,
    farmer_id TEXT NOT NULL,
    assigned_by TEXT NOT NULL,
    assigned_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REMOVED')),
    dirty_flag INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_synced_at TEXT,
    FOREIGN KEY (season_id) REFERENCES seasons(id),
    FOREIGN KEY (farmer_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS farmer_daily_reports (
    id TEXT PRIMARY KEY,
    season_id TEXT NOT NULL,
    phase_id TEXT NOT NULL,
    farmer_id TEXT NOT NULL,
    report_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'CANCELLED')),
    note TEXT,
    client_created_at TEXT NOT NULL,
    server_received_at TEXT,
    sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED')),
    server_version INTEGER NOT NULL DEFAULT 0,
    dirty_flag INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_synced_at TEXT,
    FOREIGN KEY (season_id) REFERENCES seasons(id),
    FOREIGN KEY (phase_id) REFERENCES phases(id),
    FOREIGN KEY (farmer_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS field_diaries (
    id TEXT PRIMARY KEY,
    season_id TEXT NOT NULL,
    phase_id TEXT NOT NULL,
    supervisor_id TEXT NOT NULL,
    log_date TEXT NOT NULL,
    task_code TEXT,
    content TEXT NOT NULL,
    weather TEXT,
    plant_condition TEXT,
    soil_condition TEXT,
    issue_level TEXT,
    client_created_at TEXT NOT NULL,
    server_received_at TEXT,
    sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED')),
    server_version INTEGER NOT NULL DEFAULT 0,
    dirty_flag INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_synced_at TEXT,
    FOREIGN KEY (season_id) REFERENCES seasons(id),
    FOREIGN KEY (phase_id) REFERENCES phases(id),
    FOREIGN KEY (supervisor_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS media_files (
    id TEXT PRIMARY KEY,
    owner_type TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    media_type TEXT NOT NULL,
    local_uri TEXT NOT NULL,
    remote_url TEXT,
    file_name TEXT,
    mime_type TEXT,
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    caption TEXT,
    taken_at TEXT,
    upload_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (upload_status IN ('PENDING', 'UPLOADING', 'UPLOADED', 'FAILED')),
    dirty_flag INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_synced_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS phase_events (
    id TEXT PRIMARY KEY,
    season_id TEXT NOT NULL,
    phase_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_at TEXT NOT NULL,
    note TEXT,
    sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED')),
    dirty_flag INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_synced_at TEXT,
    FOREIGN KEY (season_id) REFERENCES seasons(id),
    FOREIGN KEY (phase_id) REFERENCES phases(id),
    FOREIGN KEY (actor_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    operation_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    dependency_queue_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SYNCED', 'FAILED', 'CANCELLED')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retry INTEGER NOT NULL DEFAULT 5,
    last_error TEXT,
    next_retry_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    synced_at TEXT,
    FOREIGN KEY (dependency_queue_id) REFERENCES sync_queue(id)
  )`,
  `CREATE TABLE IF NOT EXISTS sync_state (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL
  )`,
  // Indexes – tất cả đều IF NOT EXISTS để safe khi gọi nhiều lần
  `CREATE INDEX IF NOT EXISTS idx_phases_status ON phases(status)`,
  `CREATE INDEX IF NOT EXISTS idx_field_diaries_phase_id ON field_diaries(phase_id)`,
  `CREATE INDEX IF NOT EXISTS idx_media_owner ON media_files(owner_type, owner_id)`,
  `CREATE INDEX IF NOT EXISTS idx_media_upload_status ON media_files(upload_status)`,
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at)`,
]

// Unique index cần riêng vì WHERE clause không hỗ trợ trên tất cả SQLite builds
const UNIQUE_REPORT_INDEX = `CREATE UNIQUE INDEX IF NOT EXISTS idx_farmer_daily_report_unique
  ON farmer_daily_reports(phase_id, farmer_id, report_date)`

let initialized = false

export const initializeDatabase = async () => {
  // Chỉ khởi tạo 1 lần trong vòng đời app để tránh overhead và lỗi lặp
  if (initialized) return
  initialized = true

  for (const stmt of statements) {
    execute(stmt)
  }

  // Unique index riêng – bỏ qua lỗi nếu SQLite không hỗ trợ partial index
  try {
    execute(UNIQUE_REPORT_INDEX)
  } catch (_) {
    // Bỏ qua – sẽ dùng ràng buộc INSERT OR IGNORE thay thế
  }
}

// Reset để test
export const resetDbInitFlag = () => {
  initialized = false
}
