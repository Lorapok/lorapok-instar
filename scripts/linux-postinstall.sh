#!/usr/bin/env bash
set -e

# Update mime and desktop database on Linux
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi

# Ubuntu 24.04+ AppArmor unprivileged userns configuration if AppArmor is active
APPARMOR_DIR="/etc/apparmor.d"
PROFILE_NAME="tech.lorapok.instar"

if [ -d "$APPARMOR_DIR" ] && command -v apparmor_parser >/dev/null 2>&1; then
  cat > "$APPARMOR_DIR/$PROFILE_NAME" << 'EOF'
abi <abi/4.0>,
include <tunables/global>

profile tech.lorapok.instar /opt/Lorapok\ Instar/lorapok-instar flags=(attach_disconnected) {
  include <abstractions/base>
  include <abstractions/fonts>
  include <abstractions/nameservice>
  include <abstractions/ssl_certs>

  capability sys_admin,
  capability sys_chroot,
  capability sys_ptrace,

  userns,

  /opt/Lorapok\ Instar/** mrpix,
  /dev/shm/** rw,
  /dev/dri/** rw,
  owner @{HOME}/.config/lorapok-instar/** rwk,
  owner @{HOME}/.cache/lorapok-instar/** rwk,
  /proc/** r,
  /sys/** r,
}
EOF
  apparmor_parser -r "$APPARMOR_DIR/$PROFILE_NAME" 2>/dev/null || true
fi

# Symlink CLI binary to /usr/local/bin/instar if /opt/Lorapok Instar exists
if [ -f "/opt/Lorapok Instar/lorapok-instar" ] && [ -d "/usr/local/bin" ]; then
  ln -sf "/opt/Lorapok Instar/lorapok-instar" /usr/local/bin/instar || true
fi

exit 0
