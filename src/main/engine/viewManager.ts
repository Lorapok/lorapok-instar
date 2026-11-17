import { WebContentsView, BrowserWindow, app, shell, type Rectangle, ipcMain } from 'electron'
import { join } from 'node:path'
import { AppRepository, CocoonRepository, TelemetryRepository } from '../database/repositories'
import { cocoonManager } from './cocoonManager'
import { permissionGuard } from './permissionGuard'
import { securityManager } from '../security/securityManager'
import { BUILTIN_SERVICES } from '../../shared/serviceCatalog'
import type { AppInstance, SplitViewMode, SplitViewState, ViewportRect, AppLifecycleState } from '../../shared/types'

interface ActiveViewEntry {
  appId: string
  cocoonId: string
  view: WebContentsView
  state: AppLifecycleState
  isAudible: boolean
  isCalling: boolean
  lastActiveAt: number
}

export class ViewManager {
  private mainWindow: BrowserWindow | null = null
  private viewPool = new Map<string, ActiveViewEntry>() // appId -> entry
  private currentSplitState: SplitViewState = {
    mode: 'single',
    activeAppIds: [],
    ratios: [0.5, 0.5]
  }
  private currentViewport: ViewportRect = { x: 72, y: 88, width: 1208, height: 752 }
  private hibernationCheckTimer: NodeJS.Timeout | null = null

  // Callbacks for desktop and notification hub
  private onUnreadChangedCallback?: (payload: { appId: string; unreadCount: number; globalCount: number }) => void
  private onNotificationCallback?: (payload: { cocoonId: string; appId: string; title: string; body: string; icon?: string }) => void

  public init(
    mainWindow: BrowserWindow,
    callbacks?: {
      onUnreadChanged?: (payload: { appId: string; unreadCount: number; globalCount: number }) => void
      onNotification?: (payload: { cocoonId: string; appId: string; title: string; body: string; icon?: string }) => void
    }
  ): void {
    this.mainWindow = mainWindow
    this.onUnreadChangedCallback = callbacks?.onUnreadChanged
    this.onNotificationCallback = callbacks?.onNotification

    this.setupGuestIpcListeners()
    this.startAutoHibernationLoop()
  }

  // Set the viewport dimensions from the renderer stage
  public setViewportBounds(bounds: ViewportRect): void {
    this.currentViewport = bounds
    this.layoutActiveViews()
  }

  // Switch or mount active app views according to split mode
  public async setActiveApps(appIds: string[], mode: SplitViewMode): Promise<boolean> {
    if (!this.mainWindow) return false

    this.currentSplitState.mode = mode
    this.currentSplitState.activeAppIds = [...appIds]

    // 1. Unmount views that are no longer in the active split set
    for (const [appId, entry] of this.viewPool.entries()) {
      if (!appIds.includes(appId)) {
        try {
          this.mainWindow.contentView.removeChildView(entry.view)
        } catch {
          // View might not be currently added
        }
        entry.state = 'THROTTLED_BACKGROUND'
        entry.view.webContents.setBackgroundThrottling(true)
        AppRepository.updateState(appId, 'THROTTLED_BACKGROUND')
      }
    }

    // 2. Ensure all requested active apps are mounted and warm
    for (const appId of appIds) {
      await this.ensureViewMounted(appId)
    }

    // 3. Layout mounted views
    this.layoutActiveViews()
    return true
  }

  public setSplitRatios(ratios: number[]): boolean {
    this.currentSplitState.ratios = ratios
    this.layoutActiveViews()
    return true
  }

  public getSplitState(): SplitViewState {
    return { ...this.currentSplitState }
  }

  // Mount or wake an app instance into WebContentsView
  public async ensureViewMounted(appId: string): Promise<ActiveViewEntry> {
    let entry = this.viewPool.get(appId)

    if (!entry) {
      const appRecord = AppRepository.getById(appId)
      if (!appRecord) {
        throw new Error(`App instance ${appId} does not exist`)
      }

      const cocoon = CocoonRepository.getById(appRecord.cocoonId)
      if (!cocoon) {
        throw new Error(`Cocoon ${appRecord.cocoonId} does not exist`)
      }

      // Initialize session and security rules
      const session = cocoonManager.getOrCreateSession(cocoon.id)
      permissionGuard.attachToSession(session)

      const guestPreloadPath = join(__dirname, '../preload/guestPreload.mjs')

      // Create high-efficiency WebContentsView
      const view = new WebContentsView({
        webPreferences: {
          preload: guestPreloadPath,
          session,
          partition: appRecord.partition,
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: true,
          backgroundThrottling: false
        }
      })

      // Apply WebRTC leak prevention policy
      securityManager.applyWebRtcPolicy(view.webContents, cocoon.webrtcPolicy)

      // Inject custom styling from service definition if present
      const serviceDef = BUILTIN_SERVICES.find((s) => s.id === appRecord.serviceId)
      const cssToInject = appRecord.customCss || serviceDef?.recommendedCss
      cocoonManager.injectCustomStyles(view.webContents, cssToInject)

      // Audio and call state detection
      view.webContents.on('media-started-playing', () => {
        entry!.isAudible = true
        AppRepository.updateAudible(appId, true)
      })

      view.webContents.on('media-paused', () => {
        entry!.isAudible = view.webContents.isCurrentlyAudible()
        AppRepository.updateAudible(appId, entry!.isAudible)
      })

      // Smart link routing: External links open in Linux browser, same domain stays inside
      view.webContents.setWindowOpenHandler((details) => {
        const isExternal = !details.url.includes(new URL(appRecord.url).hostname)
        if (isExternal && !details.url.includes('accounts.google.com') && !details.url.includes('facebook.com/login')) {
          shell.openExternal(details.url)
          return { action: 'deny' }
        }
        return { action: 'allow' }
      })

      // Track URL navigation state
      view.webContents.on('did-navigate', (_, url) => {
        AppRepository.update(appId, { lastUrl: url })
      })

      // Load initial URL or cached lastUrl
      const initialUrl = appRecord.lastUrl || appRecord.url
      view.webContents.loadURL(initialUrl)

      entry = {
        appId,
        cocoonId: cocoon.id,
        view,
        state: 'WARM_ACTIVE',
        isAudible: false,
        isCalling: false,
        lastActiveAt: Date.now()
      }

      this.viewPool.set(appId, entry)
    }

    // Attach to mainWindow contentView
    if (this.mainWindow) {
      const children = this.mainWindow.contentView.children
      if (!children.includes(entry.view)) {
        this.mainWindow.contentView.addChildView(entry.view)
      }
    }

    entry.state = 'WARM_ACTIVE'
    entry.lastActiveAt = Date.now()
    entry.view.webContents.setBackgroundThrottling(false)
    AppRepository.updateState(appId, 'WARM_ACTIVE')

    return entry
  }

  // Layout math for Split-View (single, dual, or triple side-by-side)
  public layoutActiveViews(): void {
    if (!this.mainWindow) return

    const { mode, activeAppIds, ratios } = this.currentSplitState
    const { x: stageX, y: stageY, width: stageW, height: stageH } = this.currentViewport

    if (activeAppIds.length === 0) return

    if (mode === 'single' || activeAppIds.length === 1) {
      const activeAppId = activeAppIds[0]
      const entry = this.viewPool.get(activeAppId)
      if (entry) {
        entry.view.setBounds({ x: stageX, y: stageY, width: stageW, height: stageH })
      }
      return
    }

    if (mode === 'dual' || activeAppIds.length === 2) {
      const r0 = ratios[0] ?? 0.5
      const w0 = Math.round(stageW * r0)
      const w1 = stageW - w0

      const entry0 = this.viewPool.get(activeAppIds[0])
      const entry1 = this.viewPool.get(activeAppIds[1])

      if (entry0) {
        entry0.view.setBounds({ x: stageX, y: stageY, width: w0, height: stageH })
      }
      if (entry1) {
        entry1.view.setBounds({ x: stageX + w0, y: stageY, width: w1, height: stageH })
      }
      return
    }

    if (mode === 'triple' && activeAppIds.length >= 3) {
      const r0 = ratios[0] ?? 0.33
      const r1 = ratios[1] ?? 0.33
      const w0 = Math.round(stageW * r0)
      const w1 = Math.round(stageW * r1)
      const w2 = stageW - w0 - w1

      const entry0 = this.viewPool.get(activeAppIds[0])
      const entry1 = this.viewPool.get(activeAppIds[1])
      const entry2 = this.viewPool.get(activeAppIds[2])

      if (entry0) {
        entry0.view.setBounds({ x: stageX, y: stageY, width: w0, height: stageH })
      }
      if (entry1) {
        entry1.view.setBounds({ x: stageX + w0, y: stageY, width: w1, height: stageH })
      }
      if (entry2) {
        entry2.view.setBounds({ x: stageX + w0 + w1, y: stageY, width: w2, height: stageH })
      }
    }
  }

  // Deep Freeze / Hibernate an app view to reclaim 150-400MB RAM
  public async hibernateApp(appId: string): Promise<boolean> {
    const entry = this.viewPool.get(appId)
    if (!entry) return false

    // Audio/Call Guard: Never hibernate if actively audible or call in progress
    if (entry.isAudible || entry.view.webContents.isCurrentlyAudible() || entry.isCalling) {
      console.log(`[ViewManager] Audio/Call Guard prevented hibernation of app ${appId}`)
      return false
    }

    // Do not hibernate if currently visible on screen
    if (this.currentSplitState.activeAppIds.includes(appId)) {
      return false
    }

    // Save last snapshot state to SQLite
    const lastUrl = entry.view.webContents.getURL()
    AppRepository.update(appId, {
      lastUrl: lastUrl !== 'about:blank' ? lastUrl : undefined,
      state: 'HIBERNATED'
    })

    // Teardown WebContentsView
    if (this.mainWindow) {
      try {
        this.mainWindow.contentView.removeChildView(entry.view)
      } catch {
        // Ignored
      }
    }

    try {
      entry.view.webContents.close()
    } catch {
      // Ignored
    }

    this.viewPool.delete(appId)
    console.log(`[ViewManager] App ${appId} successfully hibernated (RAM reclaimed)`)
    return true
  }

  // Hibernate all eligible inactive background apps
  public async hibernateAllInactive(): Promise<number> {
    let count = 0
    const activeSet = new Set(this.currentSplitState.activeAppIds)

    for (const [appId] of Array.from(this.viewPool.entries())) {
      if (!activeSet.has(appId)) {
        const success = await this.hibernateApp(appId)
        if (success) count++
      }
    }

    return count
  }

  // Reload views currently mounted in the split viewport
  public reloadActiveViews(): boolean {
    for (const appId of this.currentSplitState.activeAppIds) {
      const entry = this.viewPool.get(appId)
      if (entry) {
        entry.view.webContents.reload()
      }
    }
    return true
  }

  // Setup guest preload IPC message routing
  private setupGuestIpcListeners(): void {
    // Guest unread count updates
    ipcMain.on('instar:guest:unread-update', (event, unreadCount: number) => {
      // Locate corresponding app instance by webContents id
      for (const [appId, entry] of this.viewPool.entries()) {
        if (entry.view.webContents.id === event.sender.id) {
          AppRepository.updateUnreadCount(appId, unreadCount)
          const totalUnreadRow = AppRepository.getAll()
          const globalCount = totalUnreadRow.reduce((acc, curr) => acc + curr.unreadCount, 0)

          if (this.onUnreadChangedCallback) {
            this.onUnreadChangedCallback({ appId, unreadCount, globalCount })
          }
          break
        }
      }
    })

    // Guest notification proxy
    ipcMain.on('instar:guest:notification', (event, payload: { title: string; body: string; icon?: string }) => {
      for (const [appId, entry] of this.viewPool.entries()) {
        if (entry.view.webContents.id === event.sender.id) {
          if (this.onNotificationCallback) {
            this.onNotificationCallback({
              cocoonId: entry.cocoonId,
              appId,
              title: payload.title,
              body: payload.body,
              icon: payload.icon
            })
          }
          break
        }
      }
    })
  }

  // Periodic auto-hibernation loop based on Cocoon inactivity thresholds
  private startAutoHibernationLoop(): void {
    if (this.hibernationCheckTimer) {
      clearInterval(this.hibernationCheckTimer)
    }

    this.hibernationCheckTimer = setInterval(() => {
      const now = Date.now()
      const activeSet = new Set(this.currentSplitState.activeAppIds)

      for (const [appId, entry] of this.viewPool.entries()) {
        if (!activeSet.has(appId)) {
          const cocoon = CocoonRepository.getById(entry.cocoonId)
          const timeoutMinutes = cocoon?.autoHibernateMinutes || 10

          if (timeoutMinutes > 0) {
            const idleThresholdMs = timeoutMinutes * 60 * 1000
            if (now - entry.lastActiveAt >= idleThresholdMs) {
              this.hibernateApp(appId).catch((err) => {
                console.error(`[ViewManager] Failed auto-hibernation for app ${appId}`, err)
              })
            }
          }
        }
      }
    }, 60_000)
  }

  public destroy(): void {
    if (this.hibernationCheckTimer) {
      clearInterval(this.hibernationCheckTimer)
      this.hibernationCheckTimer = null
    }

    for (const [_, entry] of this.viewPool.entries()) {
      try {
        entry.view.webContents.close()
      } catch {
        // Ignored
      }
    }
    this.viewPool.clear()
  }
}

export const viewManager = new ViewManager()
