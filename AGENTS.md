# MASTER ENGINEERING SPECIFICATION: LORAPOK INSTAR
**Organization:** Lorapok Labs  
**Product:** Lorapok Instar (`lorapok-instar` / CLI binary: `instar`)  
**Target OS:** Ubuntu Desktop (22.04 LTS, 24.04 LTS, 26.04+) & Debian/Fedora Linux (Native Wayland + X11)  
**Engineering Standard:** High-throughput, low-memory-footprint, zero-leakage sandboxed desktop architecture.

---

## 1. CORE ARCHITECTURAL PHILOSOPHY & PERFORMANCE TARGETS
We are building a **systems-grade multi-account workspace**—not a sluggish browser wrapper. Every architectural choice must satisfy these non-negotiable engineering benchmarks:
1. **Cold Startup Time:** `< 900ms` to interactive shell using V8 code caching (`v8-compile-cache`), lazy-loaded `WebContentsView` mounting, and deferred background partition warming.
2. **RAM Discipline (Process Pooling & Hibernation):**
   - Never boot all Cocoons at startup. Only mount the active view; pre-warm pinned priority apps lazily after `1500ms`.
   - Enforce Chromium renderer process limits and automatic **Deep Freeze / Hibernation** (`webContents.setBackgroundThrottling(true)` + full view teardown with state snapshot) for idle apps after configurable thresholds (`3m`, `10m`, `30m`, `Never`).
3. **Zero-Lag 60/120fps Compositing on Linux:**
   - Enable native Ozone Wayland + Vulkan/VA-API hardware video decoding flags automatically when running under `$XDG_SESSION_TYPE=wayland`, with graceful fallback to X11/EGL.
4. **Hardened Cryptographic Isolation:**
   - Every **Cocoon** runs inside an isolated Chromium `Session` partition (`persist:cocoon_<uuidv7>`) with strict network/storage boundaries, encrypted local metadata, OS keyring integration (`libsecret`), and zero cross-partition cookie/IndexedDB/CacheStorage leakage.

---

## 2. TECHNOLOGY STACK & TOOLING
- **Runtime:** Electron (Latest Stable) + Node.js LTS (Strict TypeScript `5.x`, `"strict": true`, zero `any` types).
- **View Architecture:** Modern **`WebContentsView`** API (strictly avoid deprecated `<webview>` tags and deprecated `BrowserView` to eliminate IPC overhead and input latency).
- **Build Pipeline:** `electron-vite` (Rollup + esbuild) for instant HMR and production bytecode/minification + `electron-builder` for `.deb`, `.AppImage`, and `.tar.zst` Linux packages.
- **Renderer UI:** React 19 + TypeScript + Tailwind CSS + Zustand (with `immer` middleware) + Lucide Icons.
- **Database & Local Storage:** `better-sqlite3` configured in **WAL (Write-Ahead Logging)** mode (`PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;`) for microsecond reads/writes of Cocoon configs, unread states, and LRU cache indexes.

---

## 3. MULTI-TIER CACHING & PERFORMANCE ENGINE (`cacheManager.ts`)
Implement a dedicated **3-Tier Caching & Resource Optimization Layer** inside the main process:

### Tier 1: Intelligent HTTP & Asset Disk Cache Governance
- Configure per-Cocoon Chromium HTTP disk cache ceilings (`cacheSize` per partition, e.g., `250MB` default, configurable up to `1GB`) so 10 active social accounts never bloat `~/.config/lorapok-instar/` into gigabytes of stale media.
- Implement an **LRU Cache Eviction Worker** running on idle (`powerMonitor` idle check) that prunes orphaned Chromium `Cache_Data`, `Code Cache`, and `GPUCache` artifacts older than 14 days without touching active authentication cookies or IndexedDB message stores.

### Tier 2: Preload & V8 Bytecode Caching
- Compile main and preload bundles with V8 bytecode caching enabled so repeated app launches and new Cocoon spins skip JavaScript parsing overhead.
- Inject lightweight custom CSS/JS rules into social web apps via `webContents.insertCSS` at `dom-ready` (blocking heavy tracking pixels/telemetry endpoints via `session.webRequest.onBeforeRequest` using a fast compiled `Set`/Trie filter—optional "Turbo Ad/Tracker Shield" toggle per Cocoon).

### Tier 3: View Lifecycle & Instant-Wake State Machine
Each app instance inside a Cocoon follows a strict 4-state lifecycle:
1. `COLD` (Config stored in SQLite; zero RAM allocated).
2. `WARM_ACTIVE` (Mounted `WebContentsView`, full GPU compositing, active WebSockets).
3. `THROTTLED_BACKGROUND` (Hidden view, timers clamped, audio muted unless active call detected via `webContents.isCurrentlyAudible()`).
4. `HIBERNATED` (View destroyed to reclaim ~150–400MB RAM per app; last URL, scroll position, and favicon cached in SQLite; clicking the tab restores it seamlessly).
- **Audio/Call Guard:** Never hibernate a view if `isCurrentlyAudible()` is `true` or an active WebRTC media stream (WhatsApp/Messenger/Discord voice/video call) is open.

---

## 4. END-TO-END ENCRYPTION & SECURITY ARCHITECTURE (`cryptoManager.ts` & `securityManager.ts`)
Design security as a first-class engineering layer suitable for sensitive personal and business accounts:

### A. Encryption at Rest (OS Keyring + AES-256-GCM)
- **Master Key Derivation:** Use Electron's `safeStorage` backed by Linux Secret Service (`gnome-keyring` / `kwallet` via `libsecret`) to store a 256-bit Master Encryption Key (MEK). Fallback to Argon2id (`crypto.scrypt` / `argon2`) derived from a user-defined Master Passphrase if running in a minimal window manager (i3/Sway/Hyprland) without a keyring daemon.
- **Encrypted Database Columns:** Sensitive fields in SQLite—including proxy credentials (`username:password`), custom session headers, Cocoon PIN hashes (Argon2id/PBKDF2), and sensitive notes—must be encrypted using **AES-256-GCM** with unique 96-bit IVs and authentication tags before hitting disk.
- **Encrypted Cocoon Backup / Export (`.instar-vault`):** Allow users to export/import their workspace layout (Cocoons, app list, proxy configs, theme settings) as an encrypted `.instar-vault` archive protected by AES-256-GCM + Argon2id password derivation.

### B. Session & Network Hardening
- **Strict Context Isolation:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true` across every renderer and guest `WebContentsView`.
- **IPC Sender Validation:** Every `ipcMain.handle` listener must validate `event.senderFrame` origin so untrusted guest web pages can never invoke privileged main-process APIs.
- **Per-Cocoon Proxy & DNS Leak Protection:** Support isolated HTTP, HTTPS, and SOCKS5 proxies per Cocoon (`session.setProxy`) with automatic auth challenge handling (`app.on('login')` scoped strictly to the requesting `webContents` partition).
- **WebRTC IP Leak Policy:** Per-Cocoon setting (`default_public_interface_only` vs `disable_non_proxied_udp`) so users routing a Cocoon through a proxy/VPN do not leak their local LAN/ISP IP over WebRTC calls.
- **Biometric / PIN Cocoon Shield:** Individual Cocoons can be locked with a PIN or auto-locked after `X` minutes of inactivity (`powerMonitor.getSystemIdleTime()`). Locked Cocoons immediately hide their `WebContentsView` behind a cryptographic lock overlay and mute notifications until unlocked.

---

## 5. COMPLETE PRODUCT FEATURES & UBUNTU DESKTOP INTEGRATION
1. **Built-in Service Engine (`serviceCatalog.ts`):**
   - Pre-tuned profiles for **WhatsApp Web**, **Facebook**, **Messenger**, **Instagram**, **X (Twitter)**, **Telegram Web**, **Discord**, **LinkedIn**, **Slack**, and **Custom Web Apps**.
   - **Dynamic User-Agent & Client Hints Spoofing:** Rewrite `User-Agent` and `Sec-CH-UA` headers via `onBeforeSendHeaders` to match current Linux Chrome stable (`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ...`) so WhatsApp, Instagram, and Google OAuth never trigger browser compatibility blocks.
2. **Split-View Multitasking Engine:**
   - Render up to **2 or 3 `WebContentsView` instances side-by-side** with draggable resize sashes (`bounds` updated smoothly at 60fps via `requestAnimationFrame` throttling). Example: Work WhatsApp + Personal WhatsApp + Telegram open simultaneously on one screen.
3. **Unified Notification & Badge Hub (`notificationHub.ts`):**
   - Intercept HTML5 `Notification` calls inside `guestPreload.ts` and route them through native Ubuntu `libnotify` (`new Notification(...)`) formatted as `[Cocoon Name • App Name] Title`.
   - Clicking an Ubuntu desktop notification wakes the window, unlocks/focuses the exact Cocoon, and activates the exact App tab.
   - Real-time unread count aggregation across all Cocoons pushed to the **Ubuntu AppIndicator / System Tray** badge and Dock/Launcher badge (`app.setBadgeCount`).
4. **Command Palette (`Ctrl+K` / `Super+Space` inside app):**
   - Sub-millisecond fuzzy search across Cocoons, Apps, Actions (Hibernate All, Clear Cache, Lock Cocoon, Toggle Split View, Export Encrypted Vault).
5. **Ubuntu/Linux Native Polish:**
   - Native Wayland + X11 window controls & Yaru/Adwaita adaptive dark/light theme tokens.
   - Single-instance lock (`app.requestSingleInstanceLock()`) so clicking the desktop icon focuses the existing window instead of spawning duplicates.
   - Smart external link routing: Same-domain & OAuth popups (`://google.com`, `://facebook.com`) stay inside the isolated Cocoon session; external links open in the user's default Ubuntu browser via `shell.openExternal`.

---

## 6. CLEAN MODULAR DIRECTORY STRUCTURE
```text
lorapok-instar/
├── package.json
├── tsconfig.json
├── electron.vite.config.ts
├── electron-builder.yml
├── README.md
├── assets/
│   ├── icons/                      # SVG + multi-res PNGs (16..512) + tray status icons
│   └── services/                   # Crisp SVG icons for built-in social platforms
├── src/
│   ├── main/
│   │   ├── index.ts                # Linux GPU/Wayland flags, single-instance lock, boot timer
│   │   ├── database/
│   │   │   ├── sqlite.ts           # better-sqlite3 WAL setup, migrations, prepared statements
│   │   │   └── repositories.ts     # Cocoon, AppInstance, CacheStats, Settings repositories
│   │   ├── security/
│   │   │   ├── cryptoManager.ts    # libsecret safeStorage + AES-256-GCM + Argon2id vault export
│   │   │   ├── securityManager.ts  # PIN lock, idle auto-lock, IPC origin guard, WebRTC policy
│   │   │   └── trackerShield.ts    # Fast webRequest domain blocker per Cocoon
│   │   ├── engine/
│   │   │   ├── cocoonManager.ts    # Partition lifecycle, UA/Client-Hints spoofing, per-cocoon proxy
│   │   │   ├── cacheManager.ts     # Disk quota enforcement, LRU eviction worker, cache metrics
│   │   │   ├── viewManager.ts      # WebContentsView pool, Split-View layout math, Hibernation engine
│   │   │   └── permissionGuard.ts  # Camera/Mic/ScreenShare (PipeWire) & download routing
│   │   ├── desktop/
│   │   │   ├── windowManager.ts    # Window geometry persistence & frameless/native Linux chrome
│   │   │   ├── trayManager.ts      # AppIndicator tray, unread badge synthesis, quick-switch menu
│   │   │   └── notificationHub.ts  # Cross-cocoon libnotify bridge & click-to-focus routing
│   │   └── ipc/
│   │       └── router.ts           # Strictly typed, sender-validated IPC handlers
│   ├── preload/
│   │   ├── mainPreload.ts          # contextBridge typed API for React shell
│   │   └── guestPreload.ts         # Title MutationObserver, Notification proxy, context menu
│   ├── renderer/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── store/useInstarStore.ts # Zustand state store synchronized with SQLite via IPC
│   │   ├── components/
│   │   │   ├── CocoonRail.tsx      # Left workspace switcher with unread badges & lock indicators
│   │   │   ├── AppTabStrip.tsx     # Active Cocoon apps, hibernation status pills, split-view toggle
│   │   │   ├── ViewportStage.tsx   # Coordinates WebContentsView bounds, split sashes & lock overlays
│   │   │   ├── CocoonModal.tsx     # Create/Edit Cocoon (Name, Color, Icon, Proxy, Cache Cap, PIN)
│   │   │   ├── ServiceCatalog.tsx  # One-click add WhatsApp, FB, IG, X, Telegram, Discord, Custom
│   │   │   ├── CommandPalette.tsx  # Ctrl+K instant fuzzy launcher
│   │   │   ├── PerformanceHud.tsx  # Live RAM per Cocoon, disk cache usage, one-click Hibernate/Purge
│   │   │   └── SettingsModal.tsx   # Wayland/GPU flags, Encryption Vault backup, Auto-hibernation rules
│   │   └── styles/globals.css
│   └── shared/
│       ├── types.ts                # End-to-end shared interfaces & IPC channel contracts
│       ├── constants.ts            # Linux Chrome UA strings, default cache quotas, shortcuts
│       └── serviceCatalog.ts       # Built-in social service definitions & custom CSS tweaks
└── scripts/
    └── linux-postinstall.sh        # Desktop entry registration & Ubuntu AppArmor sandbox helper
```

---

## 7. EXECUTION PROTOCOL & MILESTONES
1. **Milestone 1 (Foundation & Build Pipeline):** Scaffold package.json, tsconfig.json, electron.vite.config.ts, Tailwind CSS, and electron-builder.yml. Verify clean dependency installation.
2. **Milestone 2 (Persistence, Encryption & Cache Core):** Implement sqlite.ts (WAL mode + schema migrations), cryptoManager.ts (AES-256-GCM + safeStorage + .instar-vault encrypted export/import), and cacheManager.ts (per-partition quota & LRU pruning).
3. **Milestone 3 (Cocoon Isolation & View Engine):** Implement cocoonManager.ts, viewManager.ts (multi-view + Split-View + Audio-aware Hibernation state machine), trackerShield.ts, and permissionGuard.ts.
4. **Milestone 4 (Linux Desktop Integration & IPC):** Implement trayManager.ts, notificationHub.ts, guestPreload.ts, mainPreload.ts, and ipc/router.ts.
5. **Milestone 5 (High-Craft Renderer UI):** Build the complete React + Tailwind UI including CocoonRail, AppTabStrip, ViewportStage, CocoonModal, ServiceCatalog, CommandPalette, PerformanceHud (live memory & cache telemetry), and SettingsModal.
6. **Milestone 6 (Audit & Ubuntu Packaging):** Run npm run typecheck, verify boot performance and partition isolation, and validate .deb and .AppImage build targets.
