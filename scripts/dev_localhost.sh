#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${NETLIFY_DEV_PORT:-8888}"
CHECK_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check)
      CHECK_ONLY=true
      shift
      ;;
    --port)
      if [[ $# -lt 2 ]]; then
        echo "[error] --port requires a value"
        exit 1
      fi
      PORT="$2"
      shift 2
      ;;
    *)
      echo "[error] Unknown option: $1"
      echo "Usage: bash ./scripts/dev_localhost.sh [--check] [--port 8888]"
      exit 1
      ;;
  esac
done

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[error] Missing required command: $cmd"
    exit 1
  fi
}

free_port() {
  local pids
  pids="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN || true)"
  if [[ -n "$pids" ]]; then
    echo "[info] Port $PORT in use, stopping process(es): $pids"
    kill -9 $pids
    sleep 1
  fi
}

has_npm_script() {
  node -e 'const p=require("./package.json"); process.exit(p.scripts && p.scripts["dev:local"] ? 0 : 1);'
}

main() {
  require_cmd node
  require_cmd npm
  require_cmd npx
  require_cmd lsof

  if [[ "$CHECK_ONLY" == true ]]; then
    echo "[ok] node: $(node -v)"
    echo "[ok] npm: $(npm -v)"
    if command -v netlify >/dev/null 2>&1; then
      echo "[ok] netlify: $(netlify --version)"
    else
      echo "[ok] netlify: will use npx netlify-cli@latest"
    fi
    exit 0
  fi

  free_port

  echo "[info] Starting localhost on port $PORT ..."
  echo "[info] URL: http://localhost:$PORT"

  if has_npm_script; then
    echo "[info] Run: npm run dev:local"
    npm run dev:local
  else
    echo "[info] Run: npx --yes netlify-cli@latest dev --port $PORT"
    npx --yes netlify-cli@latest dev --port "$PORT"
  fi
}

main "$@"

