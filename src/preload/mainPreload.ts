import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  AppInstance,
  Cocoon,
  CocoonTelemetry,
  NotificationPayload,
  ServiceDefinition,
  SplitViewMode,
  SplitViewState,
  ViewportRect,
  InstarIpcApi
} from '../shared/types'
import { IPC_CHANNELS } from '../shared/constants'

const api: InstarIpcApi = {
  getCocoons: () => ipcRenderer.invoke(IPC_CHANNELS.COCOON_LIST),
  createCocoon: (cocoon, pin) => ipcRenderer.invoke(IPC_CHANNELS.COCOON_CREATE, cocoon, pin),
  updateCocoon: (id, updates, newPin) => ipcRenderer.invoke(IPC_CHANNELS.COCOON_UPDATE, id, updates, newPin),
  deleteCocoon: (id) => ipcRenderer.invoke(IPC_CHANNELS.COCOON_DELETE, id),
  unlockCocoon: (id, pin) => ipcRenderer.invoke(IPC_CHANNELS.COCOON_UNLOCK, id, pin),
  lockCocoon: (id) => ipcRenderer.invoke(IPC_CHANNELS.COCOON_LOCK, id),

  getApps: (cocoonId) => ipcRenderer.invoke(IPC_CHANNELS.APP_LIST, cocoonId),
  createApp: (app) => ipcRenderer.invoke(IPC_CHANNELS.APP_CREATE, app),
  updateApp: (id, updates) => ipcRenderer.invoke(IPC_CHANNELS.APP_UPDATE, id, updates),
  deleteApp: (id) => ipcRenderer.invoke(IPC_CHANNELS.APP_DELETE, id),
  reorderApps: (appIds) => ipcRenderer.invoke(IPC_CHANNELS.APP_REORDER, appIds),

  setActiveApps: (appIds, splitMode) => ipcRenderer.invoke(IPC_CHANNELS.VIEW_SET_ACTIVE, appIds, splitMode),
  setSplitRatios: (ratios) => ipcRenderer.invoke(IPC_CHANNELS.VIEW_SET_SPLIT_RATIOS, ratios),
  updateViewportBounds: (bounds) => ipcRenderer.invoke(IPC_CHANNELS.VIEW_UPDATE_BOUNDS, bounds),
  hibernateApp: (appId) => ipcRenderer.invoke(IPC_CHANNELS.VIEW_HIBERNATE, appId),
  wakeApp: (appId) => ipcRenderer.invoke(IPC_CHANNELS.VIEW_WAKE, appId),
  hibernateAllInactive: () => ipcRenderer.invoke(IPC_CHANNELS.VIEW_HIBERNATE_ALL),
  reloadActiveViews: () => ipcRenderer.invoke(IPC_CHANNELS.VIEW_RELOAD),

  getTelemetry: () => ipcRenderer.invoke(IPC_CHANNELS.TELEMETRY_GET),
  clearCocoonCache: (cocoonId) => ipcRenderer.invoke(IPC_CHANNELS.CACHE_CLEAR_COCOON, cocoonId),
  clearAllCache: () => ipcRenderer.invoke(IPC_CHANNELS.CACHE_CLEAR_ALL),

  exportVault: (passphrase) => ipcRenderer.invoke(IPC_CHANNELS.VAULT_EXPORT, passphrase),
  importVault: (archiveJson, passphrase) => ipcRenderer.invoke(IPC_CHANNELS.VAULT_IMPORT, archiveJson, passphrase),
  changeMasterPassphrase: (oldPass, newPass) => ipcRenderer.invoke(IPC_CHANNELS.VAULT_CHANGE_PASSPHRASE, oldPass, newPass),

  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  updateSettings: (settings) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settings),
  getServices: () => ipcRenderer.invoke(IPC_CHANNELS.SERVICES_GET),
  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
  maximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
  isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),

  onCocoonUpdated: (callback) => {
    const handler = (_: unknown, cocoon: Cocoon) => callback(cocoon)
    ipcRenderer.on(IPC_CHANNELS.EVENT_COCOON_UPDATED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_COCOON_UPDATED, handler)
  },
  onAppUpdated: (callback) => {
    const handler = (_: unknown, app: AppInstance) => callback(app)
    ipcRenderer.on(IPC_CHANNELS.EVENT_APP_UPDATED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_APP_UPDATED, handler)
  },
  onUnreadCountChanged: (callback) => {
    const handler = (_: unknown, payload: { appId: string; unreadCount: number; globalCount: number }) => callback(payload)
    ipcRenderer.on(IPC_CHANNELS.EVENT_UNREAD_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_UNREAD_CHANGED, handler)
  },
  onNotificationReceived: (callback) => {
    const handler = (_: unknown, notification: NotificationPayload) => callback(notification)
    ipcRenderer.on(IPC_CHANNELS.EVENT_NOTIFICATION_RECEIVED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_NOTIFICATION_RECEIVED, handler)
  },
  onSplitViewChanged: (callback) => {
    const handler = (_: unknown, state: SplitViewState) => callback(state)
    ipcRenderer.on(IPC_CHANNELS.EVENT_SPLIT_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_SPLIT_CHANGED, handler)
  },
  onFocusAppRequested: (callback) => {
    const handler = (_: unknown, payload: { cocoonId: string; appId: string }) => callback(payload)
    ipcRenderer.on(IPC_CHANNELS.EVENT_FOCUS_REQUESTED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_FOCUS_REQUESTED, handler)
  }
}

contextBridge.exposeInMainWorld('instar', api)
