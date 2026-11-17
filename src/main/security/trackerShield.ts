import type { Session } from 'electron'

const TRACKER_DOMAINS = new Set([
  // Common tracking and advertising beacons
  'google-analytics.com',
  'googletagmanager.com',
  'stats.g.doubleclick.net',
  'doubleclick.net',
  'analytics.google.com',
  'facebook.net/signals',
  'pixel.facebook.com',
  'analytics.twitter.com',
  't.co/i/adsct',
  'ads-twitter.com',
  'telemetry.discordapp.net',
  'telemetry.discord.gg',
  'amplitude.com',
  'api.amplitude.com',
  'mixpanel.com',
  'api.mixpanel.com',
  'segment.io',
  'api.segment.io',
  'browser-intake-datadoghq.com',
  'clarity.ms',
  'hotjar.com',
  'script.hotjar.com',
  'scorecardresearch.com',
  'outbrain.com',
  'taboola.com'
])

export class TrackerShield {
  // Check if a URL host matches any known tracker or telemetry beacon
  public isTracker(urlStr: string): boolean {
    try {
      const parsed = new URL(urlStr)
      const host = parsed.hostname.toLowerCase()

      // Exact host match
      if (TRACKER_DOMAINS.has(host)) {
        return true
      }

      // Suffix match for subdomains
      for (const tracker of TRACKER_DOMAINS) {
        if (host.endsWith('.' + tracker)) {
          return true
        }
      }

      // Path match for specific telemetry routes
      const full = host + parsed.pathname
      for (const tracker of TRACKER_DOMAINS) {
        if (tracker.includes('/') && full.includes(tracker)) {
          return true
        }
      }

      return false
    } catch {
      return false
    }
  }

  // Attach tracker blocking to a Cocoon partition session
  public attachToSession(session: Session, isEnabled: () => boolean): void {
    session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => {
      if (!isEnabled()) {
        callback({ cancel: false })
        return
      }

      if (this.isTracker(details.url)) {
        // Log blocked telemetry request
        callback({ cancel: true })
        return
      }

      callback({ cancel: false })
    })
  }
}

export const trackerShield = new TrackerShield()
