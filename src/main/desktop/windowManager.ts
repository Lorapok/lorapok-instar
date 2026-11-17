import { BrowserWindow, screen, shell, app } from 'electron'
import { join } from 'node:path'
import { getDatabase } from '../database/sqlite'
import type { WindowBounds } from '../../shared/types'

export class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private saveBoundsTimer: NodeJS.Timeout | null = null

  public createMainWindow(): BrowserWindow {
    const savedBounds = this.loadSavedBounds()

    const win = new BrowserWindow({
      x: savedBounds.x,
      y: savedBounds.y,
      width: savedBounds.width,
      height: savedBounds.height,
      minWidth: 800,
      minHeight: 600,
      show: false,
      autoHideMenuBar: true,
      frame: false,
      titleBarStyle: 'hidden',
      backgroundColor: '#090a0f',
      webPreferences: {
        preload: join(__dirname, '../preload/mainPreload.mjs'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true
      }
    })

    if (savedBounds.isMaximized) {
      win.maximize()
    }

    // Geometry change listeners
    win.on('resize', () => this.debounceSaveBounds(win))
    win.on('move', () => this.debounceSaveBounds(win))
    win.on('maximize', () => this.saveWindowState(win, true))
    win.on('unmaximize', () => this.saveWindowState(win, false))

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

    this.mainWindow = win
    return win
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  public minimize(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.minimize()
    }
  }

  public maximize(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize()
      } else {
        this.mainWindow.maximize()
      }
    }
  }

  public close(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.close()
    }
  }

  public isMaximized(): boolean {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      return this.mainWindow.isMaximized()
    }
    return false
  }

  private loadSavedBounds(): WindowBounds {
    try {
      const db = getDatabase()
      const row = db.prepare("SELECT value FROM app_settings WHERE key = 'window_geometry'").get() as { value: string } | undefined
      if (row && row.value) {
        const parsed = JSON.parse(row.value) as WindowBounds
        // Validate that coordinates lie within an active display area
        const displays = screen.getAllDisplays()
        const isVisibleOnAnyDisplay = displays.some((d) => {
          const { x, y, width, height } = d.bounds
          return parsed.x >= x && parsed.x < x + width && parsed.y >= y && parsed.y < y + height
        })

        if (isVisibleOnAnyDisplay) {
          return parsed
        }
      }
    } catch {
      // Fallback
    }

    // Default centered bounds
    return {
      x: undefined as unknown as number,
      y: undefined as unknown as number,
      width: 1280,
      height: 840,
      isMaximized: false
    }
  }

  private debounceSaveBounds(win: BrowserWindow): void {
    if (this.saveBoundsTimer) {
      clearTimeout(this.saveBoundsTimer)
    }

    this.saveBoundsTimer = setTimeout(() => {
      if (!win.isDestroyed() && !win.isMaximized()) {
        const bounds = win.getBounds()
        this.persistGeometry({
          ...bounds,
          isMaximized: false
        })
      }
    }, 500)
  }

  private saveWindowState(win: BrowserWindow, isMaximized: boolean): void {
    if (!win.isDestroyed()) {
      const bounds = win.getBounds()
      this.persistGeometry({
        ...bounds,
        isMaximized
      })
    }
  }

  private persistGeometry(geometry: WindowBounds): void {
    try {
      const db = getDatabase()
      db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('window_geometry', ?)").run(JSON.stringify(geometry))
    } catch {
      // Ignore
    }
  }
}

export const windowManager = new WindowManager()
