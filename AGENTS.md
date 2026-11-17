# MASTER ENGINEERING SPECIFICATION: LORAPOK INSTAR
**Organization:** Lorapok Labs  
**Product:** Lorapok Instar (`lorapok-instar` | CLI binary: `instar`)  
**Target OS:** Ubuntu Desktop (22.04 LTS, 24.04 LTS, 26.04+) & Debian/Fedora Linux (Native Wayland + X11)  
**Engineering Standard:** High-throughput, low-memory-footprint, zero-leakage sandboxed desktop architecture.

---

## 1. CORE ARCHITECTURAL PHILOSOPHY & PERFORMANCE TARGETS
Build a **systems-grade multi-account workspace**—not a sluggish browser wrapper. Every architectural decision must enforce these non-negotiable benchmarks:
1. **Cold Startup Time:** `< 900ms` to interactive shell using V8 code caching (`v8-compile-cache`), lazy-loaded `WebContentsView` mounting, and deferred background partition warming.
2. **RAM Discipline (Process Pooling & Audio-Aware Hibernation):**
   - Never boot all Cocoons at startup. Mount only the active view immediately; pre-warm pinned priority apps lazily after `1500ms`.
   - Enforce automatic **Deep Freeze / Hibernation** (`webContents.setBackgroundThrottling(true)` + full view teardown with state snapshot) for idle apps after configurable thresholds (`3m`, `10m`, `30m`, `Never`).
3. **Zero-Lag 60/120fps Compositing on Linux:**
   - Detect `$XDG_SESSION_TYPE` and GPU environment at process boot before `app.whenReady()` to configure native Ozone Wayland + Vulkan/VA-API hardware acceleration with clean X11/EGL fallback.
4. **Hardened Cryptographic Isolation:**
   - Every **Cocoon** runs inside an isolated Chromium `Session` partition (`persist:cocoon_<uuidv7>`) with strict network/storage boundaries, encrypted local metadata, OS keyring integration (`libsecret`), and zero cross-partition cookie/IndexedDB/CacheStorage leakage.

---

## 2. TECHNOLOGY STACK & TOOLING
- **Runtime:** Electron (Latest Stable) + Node.js LTS (Strict TypeScript `5.x`, `"strict": true`, zero `any` types).
- **View Architecture:** Modern **`WebContentsView`** API (strictly forbid deprecated `<webview>` tags and deprecated `BrowserView`).
- **Build Pipeline:** `electron-vite` (Rollup + esbuild) for instant HMR and production minification + `electron-builder` for `.deb`, `.AppImage`, and `.tar.zst` Linux packages.
- **Renderer UI:** React 19 + TypeScript + Tailwind CSS + Zustand (with `immer` middleware) + Lucide Icons.
- **Database & Local Storage:** `better-sqlite3` configured in **WAL (Write-Ahead Logging)** mode (`PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;`) for microsecond reads/writes of Cocoon configs, unread states, and LRU cache indexes.

---

## 3. LINUX GPU, WAYLAND & UBUNTU 24.04+ APPARMOR CONFIGURATION
In `src/main/index.ts`, execute these Chromium flags **before** `app.whenReady()`:
```typescript
import { app } from 'electron';

const isWayland = process.env.XDG_SESSION_TYPE === 'wayland' || Boolean(process.env.WAYLAND_DISPLAY);

if (isWayland) {
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
  app.commandLine.appendSwitch('enable-wayland-ime');
  app.commandLine.appendSwitch('enable-features', 'UseOzonePlatform,WaylandWindowDecorations,VaapiVideoDecodeLinuxGL,WebRTCPipeWireCapturer');
} else {
  app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecodeLinuxGL,VaapiIgnoreDriverChecks');
}

app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-software-rasterizer');
```

### `electron-builder.yml` & Ubuntu 24.04/26.04 AppArmor Profile
Ubuntu 24.04+ restricts unprivileged user namespaces (`kernel.apparmor_restrict_unprivileged_userns=1`), which breaks standard Electron SUID sandboxes unless packaged with a proper AppArmor profile in `.deb`. Include this exact `electron-builder.yml` and post-install script:
```yaml
appId: com.lorapok.instar
productName: Lorapok Instar
executableName: instar
copyright: Copyright © 2026 Lorapok Labs

directories:
  output: dist-packages
  buildResources: assets

files:
  - out/**/*
  - assets/**/*
  - package.json

asarUnpack:
  - "**/node_modules/better-sqlite3/**/*"

linux:
  target:
    - target: deb
      arch: [x64, arm64]
    - target: AppImage
      arch: [x64, arm64]
  category: Network;InstantMessaging;Office
  icon: assets/icons
  desktop:
    Name: Lorapok Instar
    Comment: Sandboxed Multi-Account Social & Messaging Workspace
    GenericName: Social Workspace
    Keywords: whatsapp;facebook;instagram;telegram;discord;social;cocoon;lorapok;
    StartupWMClass: Lorapok Instar

deb:
  depends:
    - libnotify4
    - libsecret-1-0
    - libnss3
    - libxss1
    - libxtst6
    - xdg-utils
    - libayatana-appindicator3-1
  afterInstall: scripts/linux-postinstall.sh
  afterRemove: scripts/linux-postremove.sh
```

---

## 4. MULTI-TIER CACHING & PERFORMANCE ENGINE (`cacheManager.ts`)
Implement a 3-Tier Caching & Resource Optimization Layer in the main process:
1. **Tier 1 — Per-Cocoon Disk Cache Governance:**
   - Enforce per-partition HTTP disk cache ceilings (`250MB` default, configurable `100MB–1024MB`) so 10 active accounts never bloat `~/.config/lorapok-instar/`.
   - Run an idle **LRU Cache Eviction Worker** (`powerMonitor` idle trigger) that prunes orphaned Chromium `Cache_Data`, `Code Cache`, and `GPUCache` files older than 14 days without touching authentication cookies or IndexedDB message databases.
2. **Tier 2 — Preload & Network Tracker Shield:**
   - Enable V8 bytecode caching on main and preload scripts.
   - Provide an optional **"Turbo Tracker Shield"** toggle per Cocoon using `session.webRequest.onBeforeRequest` with an O(1) `Set`/Trie domain matcher to block heavy telemetry/ad pixels and speed up web app loads.
3. **Tier 3 — 4-State View Lifecycle & Audio-Aware Hibernation:**
   - `COLD` (SQLite metadata only; `0 MB` RAM).
   - `WARM_ACTIVE` (Mounted `WebContentsView`, full GPU compositing).
   - `THROTTLED_BACKGROUND` (Hidden view, background timers throttled, audio muted unless active call detected).
   - `HIBERNATED` (View destroyed to reclaim ~150–400MB RAM; URL, scroll state, and favicon cached in SQLite; instant restore on click).
   - **Audio/Call Guard:** Never hibernate a view when `webContents.isCurrentlyAudible()` is `true` or an active WebRTC voice/video call is running.

---

## 5. END-TO-END ENCRYPTION & SECURITY ARCHITECTURE (`cryptoManager.ts` & `securityManager.ts`)
1. **Encryption at Rest (OS Keyring + AES-256-GCM):**
   - Use Electron `safeStorage` backed by Linux Secret Service (`gnome-keyring` / `kwallet` via `libsecret`) to seal a 256-bit Master Encryption Key (MEK). Fallback to Argon2id/scrypt derived from a user Master Passphrase if running in minimal WMs (i3/Sway/Hyprland) without a keyring daemon.
   - Encrypt sensitive SQLite fields (proxy credentials, custom headers, Cocoon PIN hashes) using **AES-256-GCM** with unique 96-bit IVs and authentication tags.
   - **Encrypted `.instar-vault` Backup:** Allow exporting/importing full workspace layouts (Cocoons, pinned apps, proxy settings, theme) into an AES-256-GCM + Argon2id encrypted `.instar-vault` file.
2. **Session & Network Hardening:**
   - Strict `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true` everywhere.
   - Validate `event.senderFrame` origin on every `ipcMain.handle` call.
   - Per-Cocoon HTTP/HTTPS/SOCKS5 proxy (`session.setProxy`) + WebRTC IP leak protection (`default_public_interface_only` / `disable_non_proxied_udp`).
   - **Cocoon Privacy Shield:** Individual Cocoons can be locked with a PIN or auto-locked after `X` minutes of OS idle time (`powerMonitor.getSystemIdleTime()`).

---

## 6. COMPLETE PRODUCT FEATURES & BRAND ASSETS
1. **Built-in Service Catalog (`serviceCatalog.ts`):**
   - Pre-tuned profiles for **WhatsApp Web**, **Facebook**, **Messenger**, **Instagram**, **X (Twitter)**, **Telegram Web**, **Discord**, **LinkedIn**, **Slack**, and **Custom Web Apps**.
   - Rewrite `User-Agent` and `Sec-CH-UA` headers via `onBeforeSendHeaders` to clean Linux Chrome Stable strings (`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ...`) so WhatsApp, Instagram, and Google OAuth never show unsupported browser blocks.
2. **Split-View Multitasking:**
   - Render 2 or 3 `WebContentsView` instances side-by-side with `requestAnimationFrame`-throttled draggable resize sashes.
3. **Unified Notification & Tray Hub:**
   - Intercept HTML5 `Notification` calls inside `guestPreload.ts` and route through native Ubuntu `libnotify` formatted as `[Cocoon Name • App Name] Title`. Clicking focuses the window, unlocks/switches to the exact Cocoon, and activates the exact App tab.
   - Aggregate unread counts across all Cocoons onto the **Ubuntu AppIndicator / System Tray** badge (`libayatana-appindicator`).
4. **Command Palette (`Ctrl+K`) & Live Performance HUD:**
   - Fuzzy search across Cocoons, Apps, and system actions.
   - Built-in Performance HUD showing real-time RAM usage and disk cache size per Cocoon with one-click "Hibernate Idle" and "Purge Cache" buttons.

---

## 7. DIRECTORY ARCHITECTURE
```text
lorapok-instar/
├── AGENTS.md
├── package.json
├── tsconfig.json
├── electron.vite.config.ts
├── electron-builder.yml
├── README.md
├── assets/
│   ├── icons/                      # icon.svg, icon.png (16..512), tray.svg, tray-unread.svg
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
│   │   │   ├── windowManager.ts    # Window geometry persistence & adaptive Linux chrome
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
    ├── linux-postinstall.sh        # Desktop entry registration & Ubuntu 24.04+ AppArmor profile
    └── linux-postremove.sh         # Clean AppArmor profile & desktop cache cleanup
```

---

## 8. EXECUTION PROTOCOL FOR agy
1. **Milestone 1 (Foundation & Build Pipeline):** Scaffold package.json, tsconfig.json, electron.vite.config.ts, Tailwind CSS, electron-builder.yml, scripts/linux-postinstall.sh, scripts/linux-postremove.sh, and SVG/PNG assets in assets/icons/. Verify clean dependency installation (npm install & native module rebuild for better-sqlite3).
2. **Milestone 2 (Persistence, Encryption & Cache Core):** Implement sqlite.ts (WAL mode + schema migrations), cryptoManager.ts (AES-256-GCM + safeStorage + .instar-vault encrypted export/import), and cacheManager.ts (per-partition quota & LRU pruning).
3. **Milestone 3 (Cocoon Isolation & View Engine):** Implement cocoonManager.ts, viewManager.ts (multi-view + Split-View + Audio-aware Hibernation state machine), trackerShield.ts, and permissionGuard.ts.
4. **Milestone 4 (Linux Desktop Integration & IPC):** Implement trayManager.ts, notificationHub.ts, guestPreload.ts, mainPreload.ts, and ipc/router.ts.
5. **Milestone 5 (High-Craft Renderer UI):** Build the complete React + Tailwind UI including CocoonRail, AppTabStrip, ViewportStage, CocoonModal, ServiceCatalog, CommandPalette, PerformanceHud (live memory & cache telemetry), and SettingsModal.
6. **Milestone 6 (Audit & Ubuntu Packaging):** Run npm run typecheck, verify boot performance and partition isolation, and validate npm run build:deb and npm run build:appimage targets.
