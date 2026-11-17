export const APP_ID = 'tech.lorapok.instar'
export const APP_NAME = 'Lorapok Instar'
export const CLI_BINARY = 'instar'

export const LINUX_CHROME_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'

export const CHROME_CLIENT_HINTS = {
  'Sec-CH-UA': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
  'Sec-CH-UA-Mobile': '?0',
  'Sec-CH-UA-Platform': '"Linux"',
  'Sec-CH-UA-Platform-Version': '"6.8.0"',
  'Sec-CH-UA-Arch': '"x86"',
  'Sec-CH-UA-Bitness': '"64"',
  'Sec-CH-UA-Model': '""'
}

export const WAYLAND_OZONE_FLAGS = [
  '--ozone-platform-hint=auto',
  '--enable-features=UseOzonePlatform,WaylandWindowDecorations,AcceleratedVideoDecodeLinuxGL,VaapiVideoDecoder,Vulkan',
  '--enable-gpu-rasterization',
  '--enable-zero-copy',
  '--canvas-oop-rasterization',
  '--ignore-gpu-blocklist',
  '--enable-accelerated-2d-canvas'
]

export const DEFAULT_DISK_CACHE_LIMIT_MB = 250
export const MAX_DISK_CACHE_LIMIT_MB = 1024
export const DEFAULT_HIBERNATE_MINUTES = 10
export const LRU_EVICTION_DAYS = 14
export const PINNED_APP_WARMUP_DELAY_MS = 1500

export const COCOON_COLORS = [
  { label: 'Aubergine', value: '#77216F' },
  { label: 'Ubuntu Orange', value: '#E95420' },
  { label: 'Sensory Violet', value: '#8B5CF6' },
  { label: 'Emerald Glow', value: '#10B981' },
  { label: 'Sapphire Depth', value: '#3B82F6' },
  { label: 'Amber Pulse', value: '#F59E0B' },
  { label: 'Rose Shield', value: '#F43F5E' },
  { label: 'Cyan Wave', value: '#06B6D4' }
]

export const COCOON_ICONS = [
  'layers',
  'shield',
  'briefcase',
  'user',
  'terminal',
  'globe',
  'message-square',
  'lock',
  'sparkles',
  'cpu'
]

export const IPC_CHANNELS = {
  // Cocoon
  COCOON_LIST: 'instar:cocoon:list',
  COCOON_CREATE: 'instar:cocoon:create',
  COCOON_UPDATE: 'instar:cocoon:update',
  COCOON_DELETE: 'instar:cocoon:delete',
  COCOON_LOCK: 'instar:cocoon:lock',
  COCOON_UNLOCK: 'instar:cocoon:unlock',

  // Apps
  APP_LIST: 'instar:app:list',
  APP_CREATE: 'instar:app:create',
  APP_UPDATE: 'instar:app:update',
  APP_DELETE: 'instar:app:delete',
  APP_REORDER: 'instar:app:reorder',

  // View Engine
  VIEW_SET_ACTIVE: 'instar:view:set-active',
  VIEW_SET_SPLIT_RATIOS: 'instar:view:set-split-ratios',
  VIEW_UPDATE_BOUNDS: 'instar:view:update-bounds',
  VIEW_HIBERNATE: 'instar:view:hibernate',
  VIEW_WAKE: 'instar:view:wake',
  VIEW_HIBERNATE_ALL: 'instar:view:hibernate-all',
  VIEW_RELOAD: 'instar:view:reload',

  // Cache & Telemetry
  TELEMETRY_GET: 'instar:telemetry:get',
  CACHE_CLEAR_COCOON: 'instar:cache:clear-cocoon',
  CACHE_CLEAR_ALL: 'instar:cache:clear-all',

  // Security & Vault
  VAULT_EXPORT: 'instar:vault:export',
  VAULT_IMPORT: 'instar:vault:import',
  VAULT_CHANGE_PASSPHRASE: 'instar:vault:change-passphrase',

  // Desktop & Settings
  SETTINGS_GET: 'instar:settings:get',
  SETTINGS_UPDATE: 'instar:settings:update',
  SERVICES_GET: 'instar:services:get',
  WINDOW_MINIMIZE: 'instar:window:minimize',
  WINDOW_MAXIMIZE: 'instar:window:maximize',
  WINDOW_CLOSE: 'instar:window:close',
  WINDOW_IS_MAXIMIZED: 'instar:window:is-maximized',

  // Events
  EVENT_COCOON_UPDATED: 'instar:event:cocoon-updated',
  EVENT_APP_UPDATED: 'instar:event:app-updated',
  EVENT_UNREAD_CHANGED: 'instar:event:unread-changed',
  EVENT_NOTIFICATION_RECEIVED: 'instar:event:notification-received',
  EVENT_SPLIT_CHANGED: 'instar:event:split-changed',
  EVENT_FOCUS_REQUESTED: 'instar:event:focus-requested'
} as const
