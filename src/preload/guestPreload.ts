import { ipcRenderer } from 'electron'

// Guest Preload: Injected securely into each isolated WebContentsView
;(function initGuestPreload() {
  // Extract unread badge count from document title patterns like "(3) WhatsApp", "[2] Discord", etc.
  const parseUnreadCount = (title: string): number => {
    const parenMatch = title.match(/\((\d+)\)/)
    if (parenMatch && parenMatch[1]) {
      return parseInt(parenMatch[1], 10)
    }
    const bracketMatch = title.match(/\[(\d+)\]/)
    if (bracketMatch && bracketMatch[1]) {
      return parseInt(bracketMatch[1], 10)
    }
    const bulletMatch = title.match(/•|●/)
    if (bulletMatch) {
      return 1
    }
    return 0
  }

  let lastUnreadCount = 0

  const reportUnreadCount = () => {
    const currentCount = parseUnreadCount(document.title)
    if (currentCount !== lastUnreadCount) {
      lastUnreadCount = currentCount
      ipcRenderer.send('instar:guest:unread-update', currentCount)
    }
  }

  // Observe title changes
  const titleEl = document.querySelector('title')
  if (titleEl) {
    const observer = new MutationObserver(() => reportUnreadCount())
    observer.observe(titleEl, { childList: true, subtree: true, characterData: true })
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      const el = document.querySelector('title')
      if (el) {
        const observer = new MutationObserver(() => reportUnreadCount())
        observer.observe(el, { childList: true, subtree: true, characterData: true })
      }
    })
  }

  // Intercept HTML5 Notifications to route through Instar Notification Hub
  const OriginalNotification = window.Notification
  if (OriginalNotification) {
    const ProxyNotification = function (this: unknown, title: string, options?: NotificationOptions) {
      ipcRenderer.send('instar:guest:notification', {
        title,
        body: options?.body || '',
        icon: options?.icon
      })

      // We return an object that mimics standard Notification events
      return {
        close: () => {},
        onclick: null,
        onclose: null,
        onerror: null,
        onshow: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
      }
    } as unknown as typeof Notification

    Object.defineProperty(ProxyNotification, 'permission', {
      get: () => 'granted'
    })
    ProxyNotification.requestPermission = async () => 'granted'

    window.Notification = ProxyNotification
  }

  // Initial title check
  reportUnreadCount()
})()
