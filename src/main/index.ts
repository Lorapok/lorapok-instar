import { app, BrowserWindow } from 'electron'
import { LINUX_CHROME_UA } from '../shared/constants'
import { initDatabase } from './database/sqlite'
import { cacheManager } from './engine/cacheManager'
import { cocoonManager } from './engine/cocoonManager'
import { securityManager } from './security/securityManager'
import { viewManager } from './engine/viewManager'
import { windowManager } from './desktop/windowManager'
import { trayManager } from './desktop/trayManager'
import { notificationHub } from './desktop/notificationHub'
import { registerIpcHandlers } from './ipc/router'

// High-precision startup timer
const bootStart = process.hrtime.bigint()

// Apply Linux GPU, Wayland & Ubuntu 24.04+ hardware acceleration flags before app.whenReady()
function applyLinuxHardwareAccelerationFlags() {
  if (process.platform === 'linux') {
    const isWayland = process.env.XDG_SESSION_TYPE === 'wayland' || Boolean(process.env.WAYLAND_DISPLAY)

    if (isWayland) {
      app.commandLine.appendSwitch('ozone-platform-hint', 'auto')
      app.commandLine.appendSwitch('enable-wayland-ime')
      app.commandLine.appendSwitch(
        'enable-features',
        'UseOzonePlatform,WaylandWindowDecorations,VaapiVideoDecodeLinuxGL,WebRTCPipeWireCapturer'
      )
    } else {
      app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecodeLinuxGL,VaapiIgnoreDriverChecks')
    }

    app.commandLine.appendSwitch('enable-gpu-rasterization')
    app.commandLine.appendSwitch('enable-zero-copy')
    app.commandLine.appendSwitch('disable-software-rasterizer')

    // AppArmor/Sandboxing compatibility on modern Ubuntu (24.04/26.04)
    if (process.env.INSTAR_DISABLE_SANDBOX === '1') {
      app.commandLine.appendSwitch('no-sandbox')
    }
  }

  // Set global Chrome UA string for default navigation
  app.userAgentFallback = LINUX_CHROME_UA
}

applyLinuxHardwareAccelerationFlags()

// Enforce single-instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
  process.exit(0)
}

app.whenReady().then(() => {
  // 1. Initialize SQLite Database with WAL mode & schemas
  initDatabase()

  // 2. Initialize Cache Manager (LRU evictions & telemetry)
  cacheManager.init()

  // 3. Initialize Cocoon Manager (partition isolation & proxy auth)
  cocoonManager.init()

  // 4. Create Main Window with persisted geometry
  const mainWindow = windowManager.createMainWindow()

  // 5. Initialize Security Manager (PIN lock & sender verification)
  securityManager.init(mainWindow.webContents.id, (lockedCocoon) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('instar:event:cocoon-updated', lockedCocoon)
    }
  })

  // 6. Initialize Notification Hub
  notificationHub.init(mainWindow)

  // 7. Initialize Tray Manager
  trayManager.init(mainWindow)

  // 8. Initialize View Manager
  viewManager.init(mainWindow, {
    onUnreadChanged: ({ appId, unreadCount, globalCount }) => {
      notificationHub.updateGlobalUnreadCount(globalCount)
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('instar:event:unread-changed', { appId, unreadCount, globalCount })
      }
    },
    onNotification: (payload) => {
      notificationHub.dispatchNotification(payload)
    }
  })

  // 9. Register strictly typed IPC Handlers
  registerIpcHandlers(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    const bootDurationMs = Number(process.hrtime.bigint() - bootStart) / 1_000_000
    console.log(`[Lorapok Instar] Cold startup completed in ${bootDurationMs.toFixed(2)}ms (Target < 900ms)`)
  })

  app.on('second-instance', () => {
    if (!mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  cacheManager.destroy()
  securityManager.destroy()
  viewManager.destroy()
  trayManager.destroy()
})
