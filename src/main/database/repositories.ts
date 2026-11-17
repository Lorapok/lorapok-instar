import { getDatabase } from './sqlite'
import type { Cocoon, AppInstance, AppSettings, CocoonTelemetry, ProxyConfig, WebRtcPolicy } from '../../shared/types'
import { cryptoManager } from '../security/cryptoManager'

interface CocoonRow {
  id: string
  name: string
  color: string
  icon: string
  order_index: number
  pin_hash: string | null
  is_locked: number
  lock_timeout_minutes: number
  proxy_config_encrypted: string | null
  disk_cache_limit_mb: number
  tracker_shield_enabled: number
  webrtc_policy: string
  auto_hibernate_minutes: number
  created_at: number
  updated_at: number
}

interface AppRow {
  id: string
  cocoon_id: string
  service_id: string
  name: string
  url: string
  partition: string
  icon: string
  order_index: number
  state: string
  unread_count: number
  is_audible: number
  is_calling: number
  last_active_at: number
  last_url: string | null
  custom_user_agent: string | null
  custom_css: string | null
}

interface SettingRow {
  key: string
  value: string
}

interface TelemetryRow {
  cocoon_id: string
  disk_cache_bytes: number
  code_cache_bytes: number
  memory_bytes: number
  last_updated: number
}

function mapCocoonRow(row: CocoonRow): Cocoon {
  let proxyConfig: ProxyConfig | null = null
  if (row.proxy_config_encrypted) {
    try {
      const decrypted = cryptoManager.decryptField(row.proxy_config_encrypted)
      proxyConfig = JSON.parse(decrypted)
    } catch (err) {
      console.error(`[CocoonRepository] Failed to decrypt proxy config for cocoon ${row.id}`, err)
    }
  }

  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    order: row.order_index,
    isLocked: Boolean(row.is_locked),
    hasPin: Boolean(row.pin_hash),
    lockTimeoutMinutes: row.lock_timeout_minutes,
    proxyConfig,
    diskCacheLimitMb: row.disk_cache_limit_mb,
    trackerShieldEnabled: Boolean(row.tracker_shield_enabled),
    webrtcPolicy: (row.webrtc_policy as WebRtcPolicy) || 'default_public_interface_only',
    autoHibernateMinutes: row.auto_hibernate_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapAppRow(row: AppRow): AppInstance {
  return {
    id: row.id,
    cocoonId: row.cocoon_id,
    serviceId: row.service_id,
    name: row.name,
    url: row.url,
    partition: row.partition,
    icon: row.icon,
    order: row.order_index,
    state: row.state as AppInstance['state'],
    unreadCount: row.unread_count,
    isAudible: Boolean(row.is_audible),
    isCalling: Boolean(row.is_calling),
    lastActiveAt: row.last_active_at,
    lastUrl: row.last_url || undefined,
    customUserAgent: row.custom_user_agent || undefined,
    customCss: row.custom_css || undefined
  }
}

export class CocoonRepository {
  static getAll(): Cocoon[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM cocoons ORDER BY order_index ASC').all() as CocoonRow[]
    return rows.map(mapCocoonRow)
  }

  static getById(id: string): Cocoon | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM cocoons WHERE id = ?').get(id) as CocoonRow | undefined
    return row ? mapCocoonRow(row) : null
  }

  static insert(cocoon: Omit<Cocoon, 'hasPin' | 'isLocked'>, pinHash?: string | null): Cocoon {
    const db = getDatabase()
    let encryptedProxy: string | null = null
    if (cocoon.proxyConfig) {
      encryptedProxy = cryptoManager.encryptField(JSON.stringify(cocoon.proxyConfig))
    }

    const stmt = db.prepare(`
      INSERT INTO cocoons (
        id, name, color, icon, order_index, pin_hash, is_locked, lock_timeout_minutes,
        proxy_config_encrypted, disk_cache_limit_mb, tracker_shield_enabled, webrtc_policy,
        auto_hibernate_minutes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      cocoon.id,
      cocoon.name,
      cocoon.color,
      cocoon.icon,
      cocoon.order,
      pinHash || null,
      0,
      cocoon.lockTimeoutMinutes,
      encryptedProxy,
      cocoon.diskCacheLimitMb,
      cocoon.trackerShieldEnabled ? 1 : 0,
      cocoon.webrtcPolicy,
      cocoon.autoHibernateMinutes,
      cocoon.createdAt,
      cocoon.updatedAt
    )

    return this.getById(cocoon.id)!
  }

  static update(id: string, updates: Partial<Cocoon>, newPinHash?: string | null): Cocoon {
    const db = getDatabase()
    const existing = this.getById(id)
    if (!existing) {
      throw new Error(`Cocoon ${id} not found`)
    }

    const merged = { ...existing, ...updates, updatedAt: Date.now() }
    let encryptedProxy: string | null = null
    if (merged.proxyConfig) {
      encryptedProxy = cryptoManager.encryptField(JSON.stringify(merged.proxyConfig))
    }

    const currentPinHash = db.prepare('SELECT pin_hash FROM cocoons WHERE id = ?').get(id) as { pin_hash: string | null } | undefined
    const finalPinHash = newPinHash !== undefined ? newPinHash : currentPinHash?.pin_hash

    const stmt = db.prepare(`
      UPDATE cocoons SET
        name = ?,
        color = ?,
        icon = ?,
        order_index = ?,
        pin_hash = ?,
        is_locked = ?,
        lock_timeout_minutes = ?,
        proxy_config_encrypted = ?,
        disk_cache_limit_mb = ?,
        tracker_shield_enabled = ?,
        webrtc_policy = ?,
        auto_hibernate_minutes = ?,
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      merged.name,
      merged.color,
      merged.icon,
      merged.order,
      finalPinHash,
      merged.isLocked ? 1 : 0,
      merged.lockTimeoutMinutes,
      encryptedProxy,
      merged.diskCacheLimitMb,
      merged.trackerShieldEnabled ? 1 : 0,
      merged.webrtcPolicy,
      merged.autoHibernateMinutes,
      merged.updatedAt,
      id
    )

    return this.getById(id)!
  }

  static setLockStatus(id: string, isLocked: boolean): void {
    const db = getDatabase()
    db.prepare('UPDATE cocoons SET is_locked = ? WHERE id = ?').run(isLocked ? 1 : 0, id)
  }

  static verifyPin(id: string, pin: string): boolean {
    const db = getDatabase()
    const row = db.prepare('SELECT pin_hash FROM cocoons WHERE id = ?').get(id) as { pin_hash: string | null } | undefined
    if (!row || !row.pin_hash) return true
    return cryptoManager.verifyPin(pin, row.pin_hash)
  }

  static delete(id: string): boolean {
    const db = getDatabase()
    const result = db.prepare('DELETE FROM cocoons WHERE id = ?').run(id)
    return result.changes > 0
  }
}

export class AppRepository {
  static getAll(cocoonId?: string): AppInstance[] {
    const db = getDatabase()
    let rows: AppRow[]
    if (cocoonId) {
      rows = db.prepare('SELECT * FROM app_instances WHERE cocoon_id = ? ORDER BY order_index ASC').all(cocoonId) as AppRow[]
    } else {
      rows = db.prepare('SELECT * FROM app_instances ORDER BY order_index ASC').all() as AppRow[]
    }
    return rows.map(mapAppRow)
  }

  static getById(id: string): AppInstance | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM app_instances WHERE id = ?').get(id) as AppRow | undefined
    return row ? mapAppRow(row) : null
  }

  static insert(app: AppInstance): AppInstance {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO app_instances (
        id, cocoon_id, service_id, name, url, partition, icon, order_index, state,
        unread_count, is_audible, is_calling, last_active_at, last_url, custom_user_agent, custom_css
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      app.id,
      app.cocoonId,
      app.serviceId,
      app.name,
      app.url,
      app.partition,
      app.icon,
      app.order,
      app.state,
      app.unreadCount,
      app.isAudible ? 1 : 0,
      app.isCalling ? 1 : 0,
      app.lastActiveAt,
      app.lastUrl || null,
      app.customUserAgent || null,
      app.customCss || null
    )

    return this.getById(app.id)!
  }

  static update(id: string, updates: Partial<AppInstance>): AppInstance {
    const db = getDatabase()
    const existing = this.getById(id)
    if (!existing) {
      throw new Error(`App ${id} not found`)
    }

    const merged = { ...existing, ...updates }
    const stmt = db.prepare(`
      UPDATE app_instances SET
        name = ?,
        url = ?,
        icon = ?,
        order_index = ?,
        state = ?,
        unread_count = ?,
        is_audible = ?,
        is_calling = ?,
        last_active_at = ?,
        last_url = ?,
        custom_user_agent = ?,
        custom_css = ?
      WHERE id = ?
    `)

    stmt.run(
      merged.name,
      merged.url,
      merged.icon,
      merged.order,
      merged.state,
      merged.unreadCount,
      merged.isAudible ? 1 : 0,
      merged.isCalling ? 1 : 0,
      merged.lastActiveAt,
      merged.lastUrl || null,
      merged.customUserAgent || null,
      merged.customCss || null,
      id
    )

    return this.getById(id)!
  }

  static updateState(id: string, state: AppInstance['state']): void {
    const db = getDatabase()
    db.prepare('UPDATE app_instances SET state = ? WHERE id = ?').run(state, id)
  }

  static updateUnreadCount(id: string, unreadCount: number): void {
    const db = getDatabase()
    db.prepare('UPDATE app_instances SET unread_count = ? WHERE id = ?').run(unreadCount, id)
  }

  static updateAudible(id: string, isAudible: boolean): void {
    const db = getDatabase()
    db.prepare('UPDATE app_instances SET is_audible = ? WHERE id = ?').run(isAudible ? 1 : 0, id)
  }

  static updateCalling(id: string, isCalling: boolean): void {
    const db = getDatabase()
    db.prepare('UPDATE app_instances SET is_calling = ? WHERE id = ?').run(isCalling ? 1 : 0, id)
  }

  static reorder(appIds: string[]): void {
    const db = getDatabase()
    const stmt = db.prepare('UPDATE app_instances SET order_index = ? WHERE id = ?')
    db.transaction(() => {
      appIds.forEach((id, index) => {
        stmt.run(index, id)
      })
    })()
  }

  static delete(id: string): boolean {
    const db = getDatabase()
    const result = db.prepare('DELETE FROM app_instances WHERE id = ?').run(id)
    return result.changes > 0
  }
}

export class SettingsRepository {
  static getSettings(): AppSettings {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM app_settings').all() as SettingRow[]
    const map = new Map<string, string>()
    rows.forEach((r) => map.set(r.key, r.value))

    // Calculate unread count globally across all apps
    const unreadRow = db.prepare('SELECT SUM(unread_count) as total FROM app_instances').get() as { total: number | null }
    const globalUnreadCount = unreadRow?.total || 0

    return {
      launchOnStartup: map.get('launchOnStartup') === 'true',
      startMinimized: map.get('startMinimized') === 'true',
      enableWaylandOzone: map.get('enableWaylandOzone') !== 'false',
      enableVulkanGpu: map.get('enableVulkanGpu') !== 'false',
      enableHardwareVideoDecode: map.get('enableHardwareVideoDecode') !== 'false',
      defaultHibernateMinutes: parseInt(map.get('defaultHibernateMinutes') || '10', 10),
      masterPassphraseEnabled: map.get('masterPassphraseEnabled') === 'true',
      themeMode: (map.get('themeMode') as AppSettings['themeMode']) || 'dark',
      globalUnreadCount
    }
  }

  static updateSettings(partial: Partial<AppSettings>): AppSettings {
    const db = getDatabase()
    const stmt = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)')

    db.transaction(() => {
      Object.entries(partial).forEach(([k, v]) => {
        if (k !== 'globalUnreadCount') {
          stmt.run(k, String(v))
        }
      })
    })()

    return this.getSettings()
  }
}

export class TelemetryRepository {
  static upsert(data: { cocoonId: string; diskCacheBytes: number; codeCacheBytes: number; memoryBytes: number }): void {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO cache_telemetry (cocoon_id, disk_cache_bytes, code_cache_bytes, memory_bytes, last_updated)
      VALUES (?, ?, ?, ?, ?)
    `)
    stmt.run(data.cocoonId, data.diskCacheBytes, data.codeCacheBytes, data.memoryBytes, Date.now())
  }

  static getAll(): CocoonTelemetry[] {
    const db = getDatabase()
    const cocoons = CocoonRepository.getAll()
    const rows = db.prepare('SELECT * FROM cache_telemetry').all() as TelemetryRow[]
    const teleMap = new Map<string, TelemetryRow>()
    rows.forEach((r) => teleMap.set(r.cocoon_id, r))

    return cocoons.map((c) => {
      const apps = AppRepository.getAll(c.id)
      const activeCount = apps.filter((a) => a.state === 'WARM_ACTIVE').length
      const hibernatedCount = apps.filter((a) => a.state === 'HIBERNATED').length
      const stats = teleMap.get(c.id)

      return {
        cocoonId: c.id,
        name: c.name,
        activeViewsCount: activeCount,
        hibernatedViewsCount: hibernatedCount,
        memoryBytes: stats?.memory_bytes || (activeCount * 180 * 1024 * 1024), // estimated baseline if unmeasured
        diskCacheBytes: stats?.disk_cache_bytes || 0,
        codeCacheBytes: stats?.code_cache_bytes || 0
      }
    })
  }
}
