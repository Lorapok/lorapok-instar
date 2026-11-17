import { powerMonitor, type IpcMainInvokeEvent, type WebContents } from 'electron'
import { CocoonRepository } from '../database/repositories'
import type { WebRtcPolicy, Cocoon } from '../../shared/types'

export class SecurityManager {
  private unlockedCocoonIds = new Set<string>()
  private trustedRendererWebContentsId: number | null = null
  private idleCheckInterval: NodeJS.Timeout | null = null
  private onCocoonLockedCallback?: (cocoon: Cocoon) => void

  public init(rendererWebContentsId: number, onLocked: (cocoon: Cocoon) => void): void {
    this.trustedRendererWebContentsId = rendererWebContentsId
    this.onCocoonLockedCallback = onLocked
    this.startIdleWatcher()
  }

  // Validate that IPC events originate exclusively from the privileged main renderer frame
  public validateIpcSender(event: IpcMainInvokeEvent): boolean {
    if (this.trustedRendererWebContentsId === null) {
      return true
    }

    if (event.sender.id !== this.trustedRendererWebContentsId) {
      console.warn(`[SecurityManager] Unauthorized IPC invocation blocked from webContents ID ${event.sender.id}`)
      return false
    }

    return true
  }

  public isCocoonUnlocked(cocoonId: string): boolean {
    const cocoon = CocoonRepository.getById(cocoonId)
    if (!cocoon || !cocoon.hasPin) {
      return true
    }
    return this.unlockedCocoonIds.has(cocoonId)
  }

  public unlockCocoon(cocoonId: string, pin: string): boolean {
    const valid = CocoonRepository.verifyPin(cocoonId, pin)
    if (valid) {
      this.unlockedCocoonIds.add(cocoonId)
      CocoonRepository.setLockStatus(cocoonId, false)
      return true
    }
    return false
  }

  public lockCocoon(cocoonId: string): boolean {
    this.unlockedCocoonIds.delete(cocoonId)
    CocoonRepository.setLockStatus(cocoonId, true)
    return true
  }

  // Enforce WebRTC IP leak rules per WebContents
  public applyWebRtcPolicy(webContents: WebContents, policy: WebRtcPolicy): void {
    webContents.setWebRTCIPHandlingPolicy(policy)
  }

  private startIdleWatcher(): void {
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval)
    }

    // Check system idle time every 15 seconds
    this.idleCheckInterval = setInterval(() => {
      try {
        const idleSeconds = powerMonitor.getSystemIdleTime()
        const cocoons = CocoonRepository.getAll()

        cocoons.forEach((cocoon) => {
          if (cocoon.hasPin && cocoon.lockTimeoutMinutes > 0 && !cocoon.isLocked) {
            const timeoutSeconds = cocoon.lockTimeoutMinutes * 60
            if (idleSeconds >= timeoutSeconds) {
              console.log(`[SecurityManager] Auto-locking cocoon ${cocoon.name} (${cocoon.id}) due to ${idleSeconds}s system idle`)
              this.lockCocoon(cocoon.id)
              const updated = CocoonRepository.getById(cocoon.id)
              if (updated && this.onCocoonLockedCallback) {
                this.onCocoonLockedCallback(updated)
              }
            }
          }
        })
      } catch (err) {
        console.error('[SecurityManager] Error in idle watcher', err)
      }
    }, 15_000)
  }

  public destroy(): void {
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval)
      this.idleCheckInterval = null
    }
  }
}

export const securityManager = new SecurityManager()
