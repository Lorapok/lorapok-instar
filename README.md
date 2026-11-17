# Lorapok Instar (`lorapok-instar`)

> Systems-grade, low-memory-footprint, sandboxed multi-account workspace for Ubuntu & Linux desktops.

[![CI & Quality Gate](https://github.com/Lorapok/lorapok-instar/actions/workflows/ci.yml/badge.svg)](https://github.com/Lorapok/lorapok-instar/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-orange.svg)](https://opensource.org/licenses/Apache-2.0)
[![Target OS](https://img.shields.io/badge/OS-Ubuntu_22.04%20%7C%2024.04%20%7C%2026.04-77216F.svg)](https://ubuntu.com)

---

## ⚡ Overview

**Lorapok Instar** is an open-source, systems-engineered multi-account workspace designed specifically for Linux desktop environments (Wayland and X11).

Unlike standard browser wrappers that consume gigabytes of system memory, Lorapok Instar implements a **zero-leakage WebContentsView process pooling architecture**, an **audio-aware 4-state hibernation state machine**, **SQLite WAL-mode state persistence**, and **OS-level Secret Service encryption (`libsecret` + AES-256-GCM)**.

---

## 🚀 Key Architectural Benchmarks

- **Cold Startup Time `< 900ms`:** Uses V8 bytecode caching, lazy-loaded view mounting, and deferred partition warming.
- **Modern `WebContentsView` Pooling:** Replaces deprecated `<webview>` and `BrowserView` APIs, eliminating IPC hop latency.
- **Audio-Aware Hibernation:** Automatically deep-freezes idle background apps down to **0 MB RAM**, while actively protecting WhatsApp, Discord, or Messenger voice and video calls (`isCurrentlyAudible()` guard).
- **Native Wayland + Vulkan Compositing:** Automatically engages Ozone Wayland, Vulkan, and VA-API hardware video decoding under `$XDG_SESSION_TYPE=wayland`.
- **True Encryption at Rest:** Master keys derived via Electron `safeStorage` (backed by Linux Secret Service / `gnome-keyring` / `kwallet`). Proxy credentials and `.instar-vault` archives are encrypted with **AES-256-GCM** with 96-bit random IVs and authentication tags.

---

## 🛠️ Features

1. **Split-View Multitasking:**
   - Run 1, 2, or 3 accounts side-by-side with 60fps draggable resize sashes.
   - Example: Work WhatsApp + Personal WhatsApp + Telegram open on one screen.

2. **Isolated Workspaces ("Cocoons"):**
   - Separate Chromium sessions (`persist:cocoon_<uuid>`) with zero cross-session cookie, IndexedDB, or cache leakage.
   - Individual disk cache quotas (default 250MB, configurable up to 1GB) and automated 14-day LRU pruning.
   - Optional PIN Protection: Instantly hides and locks view behind an encrypted overlay.

3. **Pre-Tuned Social Service Catalog:**
   - WhatsApp Web, Telegram Web, Discord, Slack, Messenger, Instagram Direct, X (Twitter), Facebook, LinkedIn Messaging, and Custom Web Apps.
   - Dynamic User-Agent & Client Hints spoofing to prevent browser compatibility warnings.

4. **Ubuntu & Linux Desktop Integration:**
   - Ubuntu AppIndicator System Tray with real-time unread badges.
   - Native `libnotify` bridge: `[Workspace • App] Notification` with click-to-focus navigation.
   - Single-instance lock (`instar` CLI binary).
   - Command Palette (`Ctrl+K` / `Super+Space`).
   - Performance HUD: Live memory and disk cache telemetry per workspace.

---

## 📦 Linux Installation & Packaging

Lorapok Instar is built for universal Linux store distribution:

### 1. Debian / Ubuntu Package (`.deb`)
```bash
sudo dpkg -i lorapok-instar-1.0.0-linux-amd64.deb
sudo apt-get install -f
```

### 2. Standalone AppImage
```bash
chmod +x lorapok-instar-1.0.0-linux-x86_64.AppImage
./lorapok-instar-1.0.0-linux-x86_64.AppImage
```

### 3. Ubuntu Snap Store
```bash
snapcraft
sudo snap install --dangerous lorapok-instar_1.0.0_amd64.snap
```

### 4. AppStream & Linux Store Integration
Metadata is provided via `assets/tech.lorapok.instar.metainfo.xml` conforming to the FreeDesktop AppStream 1.0 standard for GNOME Software, KDE Discover, and Ubuntu Software Center.

---

## 💻 Development & Local Build

### Prerequisites
- Node.js `22.x` or `24.x` LTS
- `libsecret-1-dev` and standard build utilities (`build-essential`)

```bash
# Clone the repository
git clone https://github.com/Lorapok/lorapok-instar.git
cd lorapok-instar

# Install dependencies
npm install

# Run local quality gate (TypeScript typecheck & production build)
./tools/local-ci.sh

# Start development mode with Hot Module Replacement (HMR)
npm run dev

# Package production release (.deb and .AppImage)
npm run dist:deb
npm run dist:appimage
```

---

## ⌨️ Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl + K` / `Super + Space` | Open Command Palette |
| `Escape` | Dismiss modal / palette / lock overlay |

---

## 📄 License

Licensed under the **Apache License, Version 2.0**. See [LICENSE](LICENSE) for details.

Engineered by **Lorapok Labs** (`https://lorapok.tech`).
