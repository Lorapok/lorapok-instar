import { app, session as electronSession, type Session, type WebContents } from 'electron'
import { CocoonRepository } from '../database/repositories'
import { trackerShield } from '../security/trackerShield'
import { LINUX_CHROME_UA, CHROME_CLIENT_HINTS } from '../../shared/constants'
import type { Cocoon, ProxyConfig } from '../../shared/types'

export class CocoonManager {
  private initializedSessions = new Set<string>()
  private proxyAuthMap = new Map<string, { username?: string; password?: string }>()

  public init(): void {
    // Listen for proxy authentication requests globally and authenticate matching sessions
    app.on('login', (event, webContents, authenticationResponseDetails, authInfo, callback) => {
      if (authInfo.isProxy) {
        const partition = webContents.session.storagePath?.split('/').pop()
        if (partition) {
          const auth = this.proxyAuthMap.get(partition)
          if (auth && auth.username && auth.password) {
            event.preventDefault()
            callback(auth.username, auth.password)
            return
          }
        }
      }
    })
  }

  // Get or initialize isolated partition session for a Cocoon
  public getOrCreateSession(cocoonId: string): Session {
    const partition = `persist:cocoon_${cocoonId}`
    const sess = electronSession.fromPartition(partition, { cache: true })

    if (!this.initializedSessions.has(partition)) {
      this.initializedSessions.add(partition)
      this.configureSession(cocoonId, sess)
    }

    return sess
  }

  // Configure network headers, user-agent spoofing, proxy, and tracking protection
  public configureSession(cocoonId: string, sess: Session): void {
    const cocoon = CocoonRepository.getById(cocoonId)

    // 1. Dynamic User-Agent & Client Hints Spoofing
    sess.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = { ...details.requestHeaders }

      headers['User-Agent'] = LINUX_CHROME_UA
      headers['Sec-CH-UA'] = CHROME_CLIENT_HINTS['Sec-CH-UA']
      headers['Sec-CH-UA-Mobile'] = CHROME_CLIENT_HINTS['Sec-CH-UA-Mobile']
      headers['Sec-CH-UA-Platform'] = CHROME_CLIENT_HINTS['Sec-CH-UA-Platform']
      headers['Sec-CH-UA-Platform-Version'] = CHROME_CLIENT_HINTS['Sec-CH-UA-Platform-Version']
      headers['Sec-CH-UA-Arch'] = CHROME_CLIENT_HINTS['Sec-CH-UA-Arch']
      headers['Sec-CH-UA-Bitness'] = CHROME_CLIENT_HINTS['Sec-CH-UA-Bitness']
      headers['Sec-CH-UA-Model'] = CHROME_CLIENT_HINTS['Sec-CH-UA-Model']

      callback({ requestHeaders: headers })
    })

    // 2. Attach Tracker Shield if enabled
    trackerShield.attachToSession(sess, () => {
      const current = CocoonRepository.getById(cocoonId)
      return current ? current.trackerShieldEnabled : true
    })

    // 3. Configure Proxy
    if (cocoon) {
      this.applyProxy(sess, cocoon)
    }
  }

  public applyProxy(sess: Session, cocoon: Cocoon): void {
    const partitionKey = `cocoon_${cocoon.id}`

    if (!cocoon.proxyConfig || !cocoon.proxyConfig.enabled) {
      this.proxyAuthMap.delete(partitionKey)
      sess.setProxy({ mode: 'direct' }).catch((err) => {
        console.error(`[CocoonManager] Error setting direct proxy for ${cocoon.id}`, err)
      })
      return
    }

    const { protocol, host, port, username, password } = cocoon.proxyConfig
    const proxyRules = `${protocol}://${host}:${port}`

    if (username && password) {
      this.proxyAuthMap.set(partitionKey, { username, password })
    } else {
      this.proxyAuthMap.delete(partitionKey)
    }

    sess.setProxy({ proxyRules }).catch((err) => {
      console.error(`[CocoonManager] Error applying proxy ${proxyRules} for ${cocoon.id}`, err)
    })
  }

  // Inject custom CSS styling into the webContents at dom-ready
  public injectCustomStyles(webContents: WebContents, customCss?: string): void {
    if (customCss && customCss.trim()) {
      webContents.on('dom-ready', () => {
        webContents.insertCSS(customCss).catch((err) => {
          console.warn('[CocoonManager] Could not insert custom CSS', err)
        })
      })
    }
  }
}

export const cocoonManager = new CocoonManager()
