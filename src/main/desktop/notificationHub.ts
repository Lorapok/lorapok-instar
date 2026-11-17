import { Notification, app, BrowserWindow } from 'electron'
import { CocoonRepository, AppRepository } from '../database/repositories'
import { trayManager } from './trayManager'
import type { NotificationPayload } from '../../shared/types'

export class NotificationHub {
  private mainWindow: BrowserWindow | null = null

  public init(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow
  }

  // Handle incoming notification from a guest partition
  public dispatchNotification(payload: NotificationPayload): void {
    const cocoon = CocoonRepository.getById(payload.cocoonId)
    const appRecord = AppRepository.getById(payload.appId)

    // If cocoon is locked, suppress content preview for privacy
    const isLocked = cocoon?.isLocked || false
    const cocoonName = cocoon?.name || 'Workspace'
    const appName = appRecord?.name || 'App'

    const title = isLocked ? `[${cocoonName}] New Encrypted Notification` : `[${cocoonName} • ${appName}] ${payload.title}`

    const body = isLocked ? 'Unlock workspace with PIN to view notification details.' : payload.body

    if (Notification.isSupported()) {
      const nativeNotif = new Notification({
        title,
        body,
        silent: isLocked
      })

      nativeNotif.on('click', () => {
        this.handleNotificationClick(payload.cocoonId, payload.appId)
      })

      nativeNotif.show()
    }

    // Forward to renderer shell
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('instar:event:notification-received', payload)
    }
  }

  // Focus and navigate to the triggering cocoon and app
  public handleNotificationClick(cocoonId: string, appId: string): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore()
    }
    this.mainWindow.show()
    this.mainWindow.focus()

    this.mainWindow.webContents.send('instar:event:focus-requested', {
      cocoonId,
      appId
    })
  }

  // Update total unread badges across system tray and dock launcher
  public updateGlobalUnreadCount(count: number): void {
    // Dock / Ubuntu launcher badge
    if (app.setBadgeCount) {
      app.setBadgeCount(count)
    }

    // System Tray badge
    trayManager.updateUnreadBadge(count)
  }
}

export const notificationHub = new NotificationHub()
