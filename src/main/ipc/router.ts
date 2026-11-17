import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants'
import { CocoonRepository, AppRepository, SettingsRepository, TelemetryRepository } from '../database/repositories'
import { cryptoManager } from '../security/cryptoManager'
import { securityManager } from '../security/securityManager'
import { viewManager } from '../engine/viewManager'
import { cacheManager } from '../engine/cacheManager'
import { windowManager } from '../desktop/windowManager'
import { BUILTIN_SERVICES } from '../../shared/serviceCatalog'
import type { Cocoon, AppInstance, AppSettings, SplitViewMode, ViewportRect, InstarVaultPayload } from '../../shared/types'

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // Cocoon Handlers
  ipcMain.handle(IPC_CHANNELS.COCOON_LIST, async (event) => {
    if (!securityManager.validateIpcSender(event)) return []
    return CocoonRepository.getAll()
  })

  ipcMain.handle(
    IPC_CHANNELS.COCOON_CREATE,
    async (event, cocoonData: Omit<Cocoon, 'id' | 'createdAt' | 'updatedAt' | 'hasPin' | 'isLocked'>, pin?: string) => {
      if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')

      const id = `cocoon_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      const now = Date.now()
      const pinHash = pin ? cryptoManager.hashPin(pin) : null

      const created = CocoonRepository.insert(
        {
          ...cocoonData,
          id,
          createdAt: now,
          updatedAt: now
        },
        pinHash
      )

      mainWindow.webContents.send(IPC_CHANNELS.EVENT_COCOON_UPDATED, created)
      return created
    }
  )

  ipcMain.handle(IPC_CHANNELS.COCOON_UPDATE, async (event, id: string, updates: Partial<Cocoon>, newPin?: string) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')

    let pinHash: string | null | undefined = undefined
    if (newPin !== undefined) {
      pinHash = newPin ? cryptoManager.hashPin(newPin) : null
    }

    const updated = CocoonRepository.update(id, updates, pinHash)
    mainWindow.webContents.send(IPC_CHANNELS.EVENT_COCOON_UPDATED, updated)
    return updated
  })

  ipcMain.handle(IPC_CHANNELS.COCOON_DELETE, async (event, id: string) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    return CocoonRepository.delete(id)
  })

  ipcMain.handle(IPC_CHANNELS.COCOON_UNLOCK, async (event, id: string, pin: string) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    return securityManager.unlockCocoon(id, pin)
  })

  ipcMain.handle(IPC_CHANNELS.COCOON_LOCK, async (event, id: string) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    return securityManager.lockCocoon(id)
  })

  // App Instance Handlers
  ipcMain.handle(IPC_CHANNELS.APP_LIST, async (event, cocoonId?: string) => {
    if (!securityManager.validateIpcSender(event)) return []
    return AppRepository.getAll(cocoonId)
  })

  ipcMain.handle(
    IPC_CHANNELS.APP_CREATE,
    async (
      event,
      appData: Omit<AppInstance, 'id' | 'state' | 'unreadCount' | 'isAudible' | 'isCalling' | 'lastActiveAt' | 'partition'>
    ) => {
      if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')

      const id = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      const partition = `persist:cocoon_${appData.cocoonId}`

      const appInstance: AppInstance = {
        ...appData,
        id,
        partition,
        state: 'COLD',
        unreadCount: 0,
        isAudible: false,
        isCalling: false,
        lastActiveAt: Date.now()
      }

      const created = AppRepository.insert(appInstance)
      mainWindow.webContents.send(IPC_CHANNELS.EVENT_APP_UPDATED, created)
      return created
    }
  )

  ipcMain.handle(IPC_CHANNELS.APP_UPDATE, async (event, id: string, updates: Partial<AppInstance>) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    const updated = AppRepository.update(id, updates)
    mainWindow.webContents.send(IPC_CHANNELS.EVENT_APP_UPDATED, updated)
    return updated
  })

  ipcMain.handle(IPC_CHANNELS.APP_DELETE, async (event, id: string) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    await viewManager.hibernateApp(id)
    return AppRepository.delete(id)
  })

  ipcMain.handle(IPC_CHANNELS.APP_REORDER, async (event, appIds: string[]) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    AppRepository.reorder(appIds)
    return true
  })

  // View Engine Handlers
  ipcMain.handle(IPC_CHANNELS.VIEW_SET_ACTIVE, async (event, appIds: string[], splitMode: SplitViewMode) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    const success = await viewManager.setActiveApps(appIds, splitMode)
    mainWindow.webContents.send(IPC_CHANNELS.EVENT_SPLIT_CHANGED, viewManager.getSplitState())
    return success
  })

  ipcMain.handle(IPC_CHANNELS.VIEW_SET_SPLIT_RATIOS, async (event, ratios: number[]) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    return viewManager.setSplitRatios(ratios)
  })

  ipcMain.handle(IPC_CHANNELS.VIEW_UPDATE_BOUNDS, async (event, bounds: ViewportRect) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    viewManager.setViewportBounds(bounds)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.VIEW_HIBERNATE, async (event, appId: string) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    return viewManager.hibernateApp(appId)
  })

  ipcMain.handle(IPC_CHANNELS.VIEW_WAKE, async (event, appId: string) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    await viewManager.ensureViewMounted(appId)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.VIEW_HIBERNATE_ALL, async (event) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    return viewManager.hibernateAllInactive()
  })

  ipcMain.handle(IPC_CHANNELS.VIEW_RELOAD, async (event) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    return viewManager.reloadActiveViews()
  })

  // Cache & Telemetry
  ipcMain.handle(IPC_CHANNELS.TELEMETRY_GET, async (event) => {
    if (!securityManager.validateIpcSender(event)) return []
    return TelemetryRepository.getAll()
  })

  ipcMain.handle(IPC_CHANNELS.CACHE_CLEAR_COCOON, async (event, cocoonId: string) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    return cacheManager.clearCocoonCache(cocoonId)
  })

  ipcMain.handle(IPC_CHANNELS.CACHE_CLEAR_ALL, async (event) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    return cacheManager.clearAllCaches()
  })

  // Security & Vault
  ipcMain.handle(IPC_CHANNELS.VAULT_EXPORT, async (event, passphrase: string) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')

    const cocoons = CocoonRepository.getAll()
    const apps = AppRepository.getAll()
    const settings = SettingsRepository.getSettings()

    const payload: InstarVaultPayload = {
      version: 1,
      exportedAt: Date.now(),
      cocoons,
      apps,
      settings
    }

    return cryptoManager.exportEncryptedVault(payload, passphrase)
  })

  ipcMain.handle(IPC_CHANNELS.VAULT_IMPORT, async (event, archiveJson: string, passphrase: string) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')

    const payload = cryptoManager.importEncryptedVault(archiveJson, passphrase)

    // Restore Cocoons and Apps
    for (const c of payload.cocoons) {
      const existing = CocoonRepository.getById(c.id)
      if (existing) {
        CocoonRepository.update(c.id, c)
      } else {
        CocoonRepository.insert(c)
      }
    }

    for (const a of payload.apps) {
      const existing = AppRepository.getById(a.id)
      if (existing) {
        AppRepository.update(a.id, a)
      } else {
        AppRepository.insert(a)
      }
    }

    if (payload.settings) {
      SettingsRepository.updateSettings(payload.settings)
    }

    return true
  })

  // Settings & Desktop
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (event) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    return SettingsRepository.getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (event, settings: Partial<AppSettings>) => {
    if (!securityManager.validateIpcSender(event)) throw new Error('Unauthorized IPC sender')
    return SettingsRepository.updateSettings(settings)
  })

  ipcMain.handle(IPC_CHANNELS.SERVICES_GET, async (event) => {
    if (!securityManager.validateIpcSender(event)) return []
    return BUILTIN_SERVICES
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, async (event) => {
    if (!securityManager.validateIpcSender(event)) return
    windowManager.minimize()
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, async (event) => {
    if (!securityManager.validateIpcSender(event)) return
    windowManager.maximize()
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, async (event) => {
    if (!securityManager.validateIpcSender(event)) return
    windowManager.close()
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, async (event) => {
    if (!securityManager.validateIpcSender(event)) return false
    return windowManager.isMaximized()
  })
}
