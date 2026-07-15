import { getDatabase, executeBatch } from './db';

export async function initializeDatabase() {
  console.log('🔧 Initializing database...');
  
  const db = getDatabase();
  
  const statements = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      fullname TEXT,
      email TEXT,
      phone TEXT,
      avatar TEXT,
      role TEXT,
      roles TEXT,
      organization TEXT,
      province TEXT,
      sync_status TEXT DEFAULT 'SYNCED',
      server_version INTEGER DEFAULT 1,
      dirty_flag INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_synced_at TEXT,
      deleted_at TEXT
    )`,

    // Seasons table
    `CREATE TABLE IF NOT EXISTS seasons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      crop_type TEXT,
      land_area REAL,
      start_date TEXT,
      end_date TEXT,
      status TEXT,
      supervisor_id TEXT,
      sync_status TEXT DEFAULT 'SYNCED',
      server_version INTEGER DEFAULT 1,
      dirty_flag INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_synced_at TEXT,
      deleted_at TEXT
    )`,

    // Phases table
    `CREATE TABLE IF NOT EXISTS phases (
      id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      phase_order INTEGER,
      planned_start_date TEXT,
      planned_end_date TEXT,
      actual_start_date TEXT,
      actual_end_date TEXT,
      status TEXT DEFAULT 'PENDING',
      sync_status TEXT DEFAULT 'SYNCED',
      server_version INTEGER DEFAULT 1,
      dirty_flag INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_synced_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (season_id) REFERENCES seasons(id)
    )`,

    // Technical descriptions table
    `CREATE TABLE IF NOT EXISTS technical_descriptions (
      id TEXT PRIMARY KEY,
      phase_id TEXT NOT NULL,
      work_description TEXT,
      materials_needed TEXT,
      estimated_duration INTEGER,
      sync_status TEXT DEFAULT 'SYNCED',
      server_version INTEGER DEFAULT 1,
      dirty_flag INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_synced_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (phase_id) REFERENCES phases(id)
    )`,

    // Season farmer assignments table
    `CREATE TABLE IF NOT EXISTS season_farmer_assignments (
      id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL,
      farmer_id TEXT NOT NULL,
      assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'SYNCED',
      server_version INTEGER DEFAULT 1,
      dirty_flag INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_synced_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (season_id) REFERENCES seasons(id),
      FOREIGN KEY (farmer_id) REFERENCES users(id)
    )`,

    // Farmer daily reports table
    `CREATE TABLE IF NOT EXISTS farmer_daily_reports (
      id TEXT PRIMARY KEY,
      farmer_id TEXT NOT NULL,
      phase_id TEXT NOT NULL,
      report_date TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'SUBMITTED',
      sync_status TEXT DEFAULT 'PENDING',
      server_version INTEGER DEFAULT 1,
      dirty_flag INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_synced_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (farmer_id) REFERENCES users(id),
      FOREIGN KEY (phase_id) REFERENCES phases(id)
    )`,

    // Field diaries table
    `CREATE TABLE IF NOT EXISTS field_diaries (
      id TEXT PRIMARY KEY,
      supervisor_id TEXT NOT NULL,
      phase_id TEXT NOT NULL,
      diary_date TEXT NOT NULL,
      notes TEXT,
      weather_condition TEXT,
      sync_status TEXT DEFAULT 'PENDING',
      server_version INTEGER DEFAULT 1,
      dirty_flag INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_synced_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (supervisor_id) REFERENCES users(id),
      FOREIGN KEY (phase_id) REFERENCES phases(id)
    )`,

    // Media files table
    `CREATE TABLE IF NOT EXISTS media_files (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      file_uri TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      upload_status TEXT DEFAULT 'PENDING',
      server_url TEXT,
      sync_status TEXT DEFAULT 'PENDING',
      server_version INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      uploaded_at TEXT,
      deleted_at TEXT
    )`,

    // Phase events table
    `CREATE TABLE IF NOT EXISTS phase_events (
      id TEXT PRIMARY KEY,
      phase_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_date TEXT NOT NULL,
      notes TEXT,
      sync_status TEXT DEFAULT 'PENDING',
      server_version INTEGER DEFAULT 1,
      dirty_flag INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_synced_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (phase_id) REFERENCES phases(id)
    )`,

    // Sync queue table
    `CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      operation TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      data TEXT,
      depends_on TEXT,
      sync_status TEXT DEFAULT 'PENDING',
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      error_message TEXT,
      priority INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced_at TEXT,
      last_retry_at TEXT
    )`,

    // Sync state table
    `CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Create indexes for performance
    `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
    `CREATE INDEX IF NOT EXISTS idx_users_sync_status ON users(sync_status)`,
    `CREATE INDEX IF NOT EXISTS idx_seasons_supervisor ON seasons(supervisor_id)`,
    `CREATE INDEX IF NOT EXISTS idx_seasons_status ON seasons(status)`,
    `CREATE INDEX IF NOT EXISTS idx_phases_season ON phases(season_id)`,
    `CREATE INDEX IF NOT EXISTS idx_phases_status ON phases(status)`,
    `CREATE INDEX IF NOT EXISTS idx_farmer_reports_farmer ON farmer_daily_reports(farmer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_farmer_reports_phase ON farmer_daily_reports(phase_id)`,
    `CREATE INDEX IF NOT EXISTS idx_farmer_reports_sync ON farmer_daily_reports(sync_status)`,
    `CREATE INDEX IF NOT EXISTS idx_field_diaries_supervisor ON field_diaries(supervisor_id)`,
    `CREATE INDEX IF NOT EXISTS idx_field_diaries_phase ON field_diaries(phase_id)`,
    `CREATE INDEX IF NOT EXISTS idx_field_diaries_sync ON field_diaries(sync_status)`,
    `CREATE INDEX IF NOT EXISTS idx_media_entity ON media_files(entity_type, entity_id)`,
    `CREATE INDEX IF NOT EXISTS idx_media_upload_status ON media_files(upload_status)`,
    `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(sync_status)`,
    `CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority DESC, created_at ASC)`,
  ];

  try {
    await executeBatch(statements);
    console.log('✅ Database initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

export async function dropAllTables() {
  const tables = [
    'sync_state',
    'sync_queue',
    'phase_events',
    'media_files',
    'field_diaries',
    'farmer_daily_reports',
    'season_farmer_assignments',
    'technical_descriptions',
    'phases',
    'seasons',
    'users',
  ];

  const statements = tables.map(table => `DROP TABLE IF EXISTS ${table}`);

  await executeBatch(statements);
  console.log('🗑️ All tables dropped');
}
