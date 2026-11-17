import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { WAYLAND_OZONE_FLAGS, LINUX_CHROME_UA } from '../shared/constants'

// High-precision startup timer
const bootStart = process.hrtime.bigint()

// Apply Linux Wayland / Vulkan / VA-API GPU flags
function applyLinuxHardwareAccelerationFlags() {
  if (process.platform === 'linux') {
    // Detect Wayland session
    const isWayland = process.env.XDG_SESSION_TYPE === 'wayland'
    if (isWayland) {
      app.commandLine.appendSwitch('ozone-platform-hint', 'auto')
      app.commandLine.appendSwitch('enable-features', 'UseOzonePlatform,WaylandWindowDecorations,AcceleratedVideoDecodeLinuxGL,VaapiVideoDecoder,Vulkan')
    }

    app.commandLine.appendSwitch('enable-gpu-rasterization')
    app.commandLine.appendSwitch('enable-zero-copy')
    app.commandLine.appendSwitch('canvas-oop-rasterization')
    app.commandLine.appendSwitch('ignore-gpu-blocklist')
    app.commandLine.appendSwitch('enable-accelerated-2d-canvas')

    // AppArmor/Sandboxing compatibility on modern Ubuntu (24.04/26.04)
    // When run unconfined or in standard container, ensure renderer doesn't abort
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

let mainWindow: BrowserWindow | null = null

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#090a0f',
    webPreferences: {
      preload: join(__dirname, '../preload/mainPreload.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  win.on('ready-to-show', () => {
    win.show()
    const bootDurationMs = Number(process.hrtime.bigint() - bootStart) / 1_000_000
    console.log(`[Lorapok Instar] Cold startup completed in ${bootDurationMs.toFixed(2)}ms`)
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  mainWindow = createMainWindow()

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
