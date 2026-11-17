export type AppLifecycleState = 'COLD' | 'WARM_ACTIVE' | 'THROTTLED_BACKGROUND' | 'HIBERNATED'

export type SplitViewMode = 'single' | 'dual' | 'triple'

export type WebRtcPolicy = 'default_public_interface_only' | 'disable_non_proxied_udp'

export interface ProxyConfig {
  enabled: boolean
  protocol: 'http' | 'https' | 'socks5'
  host: string
  port: number
  username?: string
  password?: string
}

export interface Cocoon {
  id: string
  name: string
  color: string
  icon: string
  order: number
  isLocked: boolean
  hasPin: boolean
  lockTimeoutMinutes: number
  proxyConfig: ProxyConfig | null
  diskCacheLimitMb: number
  trackerShieldEnabled: boolean
  webrtcPolicy: WebRtcPolicy
  autoHibernateMinutes: number
  createdAt: number
  updatedAt: number
}

export interface AppInstance {
  id: string
  cocoonId: string
  serviceId: string
  name: string
  url: string
  partition: string
  icon: string
  order: number
  state: AppLifecycleState
  unreadCount: number
  isAudible: boolean
  isCalling: boolean
  lastActiveAt: number
  customUserAgent?: string
  customCss?: string
  lastUrl?: string
}

export interface SplitViewState {
  mode: SplitViewMode
  activeAppIds: string[]
  ratios: number[]
}

export interface CocoonTelemetry {
  cocoonId: string
  name: string
  activeViewsCount: number
  hibernatedViewsCount: number
  memoryBytes: number
  diskCacheBytes: number
  codeCacheBytes: number
}

export interface AppSettings {
  launchOnStartup: boolean
  startMinimized: boolean
  enableWaylandOzone: boolean
  enableVulkanGpu: boolean
  enableHardwareVideoDecode: boolean
  defaultHibernateMinutes: number
  masterPassphraseEnabled: boolean
  themeMode: 'dark' | 'light' | 'system'
  globalUnreadCount: number
}

export interface InstarVaultPayload {
  version: number
  exportedAt: number
  cocoons: Cocoon[]
  apps: AppInstance[]
  settings: AppSettings
}

export interface InstarVaultArchive {
  signature: 'INSTAR_VAULT_V1'
  salt: string
  iv: string
  authTag: string
  ciphertext: string
}

export interface NotificationPayload {
  cocoonId: string
  appId: string
  title: string
  body: string
  icon?: string
  badge?: number
}

export interface ServiceDefinition {
  id: string
  name: string
  url: string
  icon: string
  category: 'chat' | 'social' | 'collaboration' | 'custom'
  defaultUserAgent?: string
  recommendedCss?: string
}

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
  isMaximized: boolean
}

export interface ViewportRect {
  x: number
  y: number
  width: number
  height: number
}

export interface InstarIpcApi {
  // Cocoon operations
  getCocoons: () => Promise<Cocoon[]>
  createCocoon: (cocoon: Omit<Cocoon, 'id' | 'createdAt' | 'updatedAt' | 'hasPin' | 'isLocked'>, pin?: string) => Promise<Cocoon>
  updateCocoon: (id: string, updates: Partial<Cocoon>, newPin?: string | null) => Promise<Cocoon>
  deleteCocoon: (id: string) => Promise<boolean>
  unlockCocoon: (id: string, pin: string) => Promise<boolean>
  lockCocoon: (id: string) => Promise<boolean>

  // App instance operations
  getApps: (cocoonId?: string) => Promise<AppInstance[]>
  createApp: (app: Omit<AppInstance, 'id' | 'state' | 'unreadCount' | 'isAudible' | 'isCalling' | 'lastActiveAt' | 'partition'>) => Promise<AppInstance>
  updateApp: (id: string, updates: Partial<AppInstance>) => Promise<AppInstance>
  deleteApp: (id: string) => Promise<boolean>
  reorderApps: (appIds: string[]) => Promise<boolean>

  // View engine operations
  setActiveApps: (appIds: string[], splitMode: SplitViewMode) => Promise<boolean>
  setSplitRatios: (ratios: number[]) => Promise<boolean>
  updateViewportBounds: (bounds: ViewportRect) => Promise<boolean>
  hibernateApp: (appId: string) => Promise<boolean>
  wakeApp: (appId: string) => Promise<boolean>
  hibernateAllInactive: () => Promise<number>
  reloadActiveViews: () => Promise<boolean>

  // Cache & telemetry
  getTelemetry: () => Promise<CocoonTelemetry[]>
  clearCocoonCache: (cocoonId: string) => Promise<boolean>
  clearAllCache: () => Promise<boolean>

  // Security & Vault
  exportVault: (passphrase: string) => Promise<string>
  importVault: (archiveJson: string, passphrase: string) => Promise<boolean>
  changeMasterPassphrase: (oldPass: string, newPass: string) => Promise<boolean>

  // Settings & Desktop
  getSettings: () => Promise<AppSettings>
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>
  getServices: () => Promise<ServiceDefinition[]>
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  isMaximized: () => Promise<boolean>

  // Event subscriptions (renderer listeners)
  onCocoonUpdated: (callback: (cocoon: Cocoon) => void) => () => void
  onAppUpdated: (callback: (app: AppInstance) => void) => () => void
  onUnreadCountChanged: (callback: (payload: { appId: string; unreadCount: number; globalCount: number }) => void) => () => void
  onNotificationReceived: (callback: (notification: NotificationPayload) => void) => () => void
  onSplitViewChanged: (callback: (state: SplitViewState) => void) => () => void
  onFocusAppRequested: (callback: (payload: { cocoonId: string; appId: string }) => void) => () => void
}

declare global {
  interface Window {
    instar: InstarIpcApi
  }
}
