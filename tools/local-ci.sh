#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo " Lorapok Instar - Local CI & Quality Gate "
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "[1/4] Verifying node and npm environment..."
node -v
npm -v

echo "[2/4] Verifying dependencies..."
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "[3/4] Running strict TypeScript typecheck..."
npm run typecheck

echo "[4/4] Running production build verification..."
npm run build

echo "=========================================="
echo " ✅ Local CI checks passed successfully! "
echo "=========================================="
