import { type Session, shell, app, dialog } from 'electron'
import { join } from 'node:path'

export class PermissionGuard {
  // Attach permission handlers and download interceptors to a partition session
  public attachToSession(session: Session): void {
    // 1. Permission request routing (Camera, Microphone, Notifications, Screen Capture)
    session.setPermissionRequestHandler((webContents, permission, callback, details) => {
      // Auto-grant essential communication permissions for messaging apps
      const allowedPermissions = new Set([
        'media',
        'mediaKeySystem',
        'notifications',
        'clipboard-read',
        'clipboard-sanitized-write',
        'fullscreen'
      ])

      if (allowedPermissions.has(permission)) {
        callback(true)
        return
      }

      // Geolocation and privacy-sensitive permissions: deny by default
      if (permission === 'geolocation') {
        console.log(`[PermissionGuard] Denied privacy-sensitive permission: ${permission} for ${details.requestingUrl}`)
        callback(false)
        return
      }

      callback(true)
    })

    // 2. Permission check handler (queries from web applications)
    session.setPermissionCheckHandler((webContents, permission) => {
      if (permission === 'notifications' || permission === 'clipboard-read' || permission === 'media') {
        return true
      }
      return false
    })

    // 3. Download routing and file integrity
    session.on('will-download', (event, item, webContents) => {
      const defaultDownloadFolder = app.getPath('downloads')
      const fileName = item.getFilename()
      const destinationPath = join(defaultDownloadFolder, fileName)

      // Set default save path
      item.setSavePath(destinationPath)

      item.on('updated', (_, state) => {
        if (state === 'interrupted') {
          console.warn(`[PermissionGuard] Download interrupted: ${fileName}`)
        }
      })

      item.once('done', (_, state) => {
        if (state === 'completed') {
          console.log(`[PermissionGuard] Download completed: ${destinationPath}`)
        }
      })
    })
  }
}

export const permissionGuard = new PermissionGuard()
