#!/bin/bash
set -e

APP_BIN="/opt/Lorapok Instar/instar"
APPARMOR_PROFILE="/etc/apparmor.d/lorapok-instar"

if [ -f "$APP_BIN" ]; then
  chmod 4755 "/opt/Lorapok Instar/chrome-sandbox" 2>/dev/null || true
fi

if command -v apparmor_parser >/dev/null 2>&1 && [ -d /etc/apparmor.d ]; then
  cat << 'EOF' > "$APPARMOR_PROFILE"
abi <abi/4.0>,
include <tunables/global>

profile lorapok-instar "/opt/Lorapok Instar/instar" flags=(unconfined) {
  userns,
  include if exists <local/lorapok-instar>
}
EOF
  apparmor_parser -r -T -W "$APPARMOR_PROFILE" 2>/dev/null || true
fi

# Symlink CLI binary to /usr/local/bin/instar
if [ -f "$APP_BIN" ] && [ -d "/usr/local/bin" ]; then
  ln -sf "$APP_BIN" /usr/local/bin/instar || true
elif [ -f "/opt/Lorapok Instar/lorapok-instar" ] && [ -d "/usr/local/bin" ]; then
  ln -sf "/opt/Lorapok Instar/lorapok-instar" /usr/local/bin/instar || true
fi

update-desktop-database /usr/share/applications 2>/dev/null || true
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi

exit 0
