import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { CocoonRepository } from '../database/repositories'
import { viewManager } from '../engine/viewManager'
import { cacheManager } from '../engine/cacheManager'
import { APP_NAME } from '../../shared/constants'

export class TrayManager {
  private tray: Tray | null = null
  private mainWindow: BrowserWindow | null = null
  private unreadCount = 0

  public init(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow
    const normalIcon = this.getTrayIcon(false)

    this.tray = new Tray(normalIcon)
    this.tray.setToolTip(`${APP_NAME} - Multi-Account Workspace`)

    this.tray.on('click', () => {
      this.toggleWindow()
    })

    this.updateContextMenu()
  }

  public updateUnreadBadge(unreadCount: number): void {
    this.unreadCount = unreadCount
    if (!this.tray) return

    const icon = this.getTrayIcon(unreadCount > 0)
    this.tray.setImage(icon)

    const tooltip = unreadCount > 0 ? `${APP_NAME} (${unreadCount} unread messages)` : APP_NAME
    this.tray.setToolTip(tooltip)

    this.updateContextMenu()
  }

  public updateContextMenu(): void {
    if (!this.tray) return

    const cocoons = CocoonRepository.getAll()

    const cocoonMenuItems: Electron.MenuItemConstructorOptions[] = cocoons.map((c) => ({
      label: `${c.name} ${c.isLocked ? '🔒' : ''}`,
      click: () => {
        this.focusWindow()
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('instar:event:focus-requested', { cocoonId: c.id })
        }
      }
    }))

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `${APP_NAME} ${this.unreadCount > 0 ? `(${this.unreadCount} unread)` : ''}`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Open Workspace',
        click: () => this.focusWindow()
      },
      {
        label: 'Workspaces (Cocoons)',
        submenu: cocoonMenuItems.length > 0 ? cocoonMenuItems : [{ label: 'No workspaces', enabled: false }]
      },
      { type: 'separator' },
      {
        label: 'Hibernate Inactive Apps',
        click: () => {
          viewManager.hibernateAllInactive().then((count) => {
            console.log(`[TrayManager] Hibernated ${count} background apps from tray`)
          })
        }
      },
      {
        label: 'Purge Disk Cache',
        click: () => {
          cacheManager.clearAllCaches().then(() => {
            console.log('[TrayManager] Purged all disk caches from tray')
          })
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }

  private toggleWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return

    if (this.mainWindow.isVisible()) {
      if (this.mainWindow.isFocused()) {
        this.mainWindow.hide()
      } else {
        this.mainWindow.focus()
      }
    } else {
      this.mainWindow.show()
      this.mainWindow.focus()
    }
  }

  private focusWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore()
    }
    this.mainWindow.show()
    this.mainWindow.focus()
  }

  private getTrayIcon(hasBadge: boolean): Electron.NativeImage {
    const iconName = hasBadge ? 'tray-badge.png' : 'tray-normal.png'
    const candidatePaths = [
      join(app.getAppPath(), 'assets/icons', iconName),
      join(__dirname, '../../assets/icons', iconName),
      join(process.resourcesPath, 'icons', iconName)
    ]

    for (const p of candidatePaths) {
      if (existsSync(p)) {
        return nativeImage.createFromPath(p)
      }
    }

    return nativeImage.createEmpty()
  }

  public destroy(): void {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }
}

export const trayManager = new TrayManager()
