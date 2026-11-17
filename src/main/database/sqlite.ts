import Database, { Database as DatabaseType } from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

let dbInstance: DatabaseType | null = null

export function getDatabasePath(): string {
  const userDataDir = app.getPath('userData')
  mkdirSync(userDataDir, { recursive: true })
  return join(userDataDir, 'instar.db')
}

export function initDatabase(customPath?: string): DatabaseType {
  if (dbInstance) {
    return dbInstance
  }

  const dbPath = customPath || getDatabasePath()
  const db = new Database(dbPath)

  // System-grade performance PRAGMAs for microsecond access
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  db.pragma('temp_store = MEMORY')
  db.pragma('mmap_size = 268435456') // 256MB memory mapped I/O
  db.pragma('cache_size = -64000')   // 64MB cache in RAM

  runMigrations(db)
  dbInstance = db
  return db
}

export function getDatabase(): DatabaseType {
  if (!dbInstance) {
    return initDatabase()
  }
  return dbInstance
}

function runMigrations(db: DatabaseType) {
  // Table for schema version tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `)

  const row = db.prepare('SELECT MAX(version) AS current_version FROM schema_version').get() as { current_version?: number }
  const currentVersion = row?.current_version || 0

  if (currentVersion < 1) {
    db.transaction(() => {
      // 1. Cocoons table
      db.exec(`
        CREATE TABLE IF NOT EXISTS cocoons (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          color TEXT NOT NULL,
          icon TEXT NOT NULL,
          order_index INTEGER NOT NULL,
          pin_hash TEXT,
          is_locked INTEGER DEFAULT 0,
          lock_timeout_minutes INTEGER DEFAULT 0,
          proxy_config_encrypted TEXT,
          disk_cache_limit_mb INTEGER DEFAULT 250,
          tracker_shield_enabled INTEGER DEFAULT 1,
          webrtc_policy TEXT DEFAULT 'default_public_interface_only',
          auto_hibernate_minutes INTEGER DEFAULT 10,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_cocoons_order ON cocoons(order_index);
      `)

      // 2. App Instances table
      db.exec(`
        CREATE TABLE IF NOT EXISTS app_instances (
          id TEXT PRIMARY KEY,
          cocoon_id TEXT NOT NULL,
          service_id TEXT NOT NULL,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          partition TEXT NOT NULL,
          icon TEXT NOT NULL,
          order_index INTEGER NOT NULL,
          state TEXT DEFAULT 'COLD',
          unread_count INTEGER DEFAULT 0,
          is_audible INTEGER DEFAULT 0,
          is_calling INTEGER DEFAULT 0,
          last_active_at INTEGER NOT NULL,
          last_url TEXT,
          custom_user_agent TEXT,
          custom_css TEXT,
          FOREIGN KEY (cocoon_id) REFERENCES cocoons(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_apps_cocoon ON app_instances(cocoon_id);
        CREATE INDEX IF NOT EXISTS idx_apps_order ON app_instances(order_index);
      `)

      // 3. Settings table
      db.exec(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `)

      // 4. Cache Telemetry table
      db.exec(`
        CREATE TABLE IF NOT EXISTS cache_telemetry (
          cocoon_id TEXT PRIMARY KEY,
          disk_cache_bytes INTEGER DEFAULT 0,
          code_cache_bytes INTEGER DEFAULT 0,
          memory_bytes INTEGER DEFAULT 0,
          last_updated INTEGER NOT NULL
        );
      `)

      // Seed initial default workspaces if brand new
      const count = db.prepare('SELECT COUNT(*) as count FROM cocoons').get() as { count: number }
      if (count.count === 0) {
        seedInitialWorkspaces(db)
      }

      db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(1, Date.now())
    })()
  }
}

function seedInitialWorkspaces(db: DatabaseType) {
  const now = Date.now()
  const personalCocoonId = 'cocoon-personal-01'
  const workCocoonId = 'cocoon-work-02'

  const insertCocoon = db.prepare(`
    INSERT INTO cocoons (
      id, name, color, icon, order_index, pin_hash, is_locked, lock_timeout_minutes,
      proxy_config_encrypted, disk_cache_limit_mb, tracker_shield_enabled, webrtc_policy,
      auto_hibernate_minutes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  insertCocoon.run(
    personalCocoonId,
    'Personal Life',
    '#E95420',
    'user',
    0,
    null,
    0,
    0,
    null,
    250,
    1,
    'default_public_interface_only',
    10,
    now,
    now
  )

  insertCocoon.run(
    workCocoonId,
    'Work & Projects',
    '#77216F',
    'briefcase',
    1,
    null,
    0,
    0,
    null,
    350,
    1,
    'default_public_interface_only',
    15,
    now,
    now
  )

  const insertApp = db.prepare(`
    INSERT INTO app_instances (
      id, cocoon_id, service_id, name, url, partition, icon, order_index, state,
      unread_count, is_audible, is_calling, last_active_at, last_url, custom_user_agent, custom_css
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  // Personal apps
  insertApp.run(
    'app-personal-whatsapp',
    personalCocoonId,
    'whatsapp',
    'WhatsApp',
    'https://web.whatsapp.com',
    `persist:cocoon_${personalCocoonId}`,
    'whatsapp',
    0,
    'COLD',
    0,
    0,
    0,
    now,
    'https://web.whatsapp.com',
    null,
    null
  )

  insertApp.run(
    'app-personal-telegram',
    personalCocoonId,
    'telegram',
    'Telegram',
    'https://web.telegram.org/a/',
    `persist:cocoon_${personalCocoonId}`,
    'telegram',
    1,
    'COLD',
    0,
    0,
    0,
    now,
    'https://web.telegram.org/a/',
    null,
    null
  )

  // Work apps
  insertApp.run(
    'app-work-slack',
    workCocoonId,
    'slack',
    'Slack',
    'https://app.slack.com/client',
    `persist:cocoon_${workCocoonId}`,
    'slack',
    0,
    'COLD',
    0,
    0,
    0,
    now,
    'https://app.slack.com/client',
    null,
    null
  )

  insertApp.run(
    'app-work-discord',
    workCocoonId,
    'discord',
    'Discord',
    'https://discord.com/app',
    `persist:cocoon_${workCocoonId}`,
    'discord',
    1,
    'COLD',
    0,
    0,
    0,
    now,
    'https://discord.com/app',
    null,
    null
  )

  // Default app settings
  const insertSetting = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)')
  insertSetting.run('launchOnStartup', 'false')
  insertSetting.run('startMinimized', 'false')
  insertSetting.run('enableWaylandOzone', 'true')
  insertSetting.run('enableVulkanGpu', 'true')
  insertSetting.run('enableHardwareVideoDecode', 'true')
  insertSetting.run('defaultHibernateMinutes', '10')
  insertSetting.run('masterPassphraseEnabled', 'false')
  insertSetting.run('themeMode', 'dark')
}
