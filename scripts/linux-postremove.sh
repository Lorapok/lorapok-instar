#!/bin/bash
set -e

APPARMOR_PROFILE="/etc/apparmor.d/lorapok-instar"

if [ -f "$APPARMOR_PROFILE" ] && command -v apparmor_parser >/dev/null 2>&1; then
  apparmor_parser -R "$APPARMOR_PROFILE" 2>/dev/null || true
  rm -f "$APPARMOR_PROFILE"
fi

# Remove CLI symlink if present
if [ -L "/usr/local/bin/instar" ]; then
  rm -f "/usr/local/bin/instar"
fi

update-desktop-database /usr/share/applications 2>/dev/null || true
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi

exit 0
