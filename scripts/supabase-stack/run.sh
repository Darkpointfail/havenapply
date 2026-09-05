#!/usr/bin/env bash
#
# Identity parity, end to end, from nothing:
#   1. start Postgres, GoTrue and PostgREST,
#   2. apply every migration to the empty database,
#   3. load the fictitious fixtures,
#   4. run the identity suite against the real authentication service,
#   5. throw it all away.
#
# Keep the stack alive for inspection or for Playwright with HAVEN_KEEP_STACK=1.
#
set -euo pipefail

cd "$(dirname "$0")/../.."

KEEP="${HAVEN_KEEP_STACK:-0}"
GATEWAY_PID=""

cleanup() {
  if [ "${KEEP}" != "1" ]; then
    [ -n "${GATEWAY_PID}" ] && kill "${GATEWAY_PID}" 2>/dev/null || true
    node scripts/supabase-stack/stack.mjs down
  else
    # The router is a plain process, not a container: killing it would leave a
    # stack that looks up and answers nothing.
    echo "stack kept at $(node -e 'console.log(require("./.supabase-stack/env.json").url)')" >&2
    echo "router still running as pid ${GATEWAY_PID}" >&2
    disown "${GATEWAY_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

node scripts/supabase-stack/stack.mjs down >/dev/null 2>&1 || true
node scripts/supabase-stack/stack.mjs up >/dev/null

node scripts/supabase-stack/stack.mjs serve &
GATEWAY_PID=$!

# GoTrue runs its own migrations on first boot.
for _ in $(seq 1 60); do
  if curl -sf -m 2 "$(node -e 'console.log(require("./.supabase-stack/env.json").url)')/auth/v1/health" >/dev/null; then
    break
  fi
  sleep 2
done

RLS_TEST_DATABASE_URL="$(node -e 'console.log(require("./.supabase-stack/env.json").databaseUrl)')"
export RLS_TEST_DATABASE_URL
node scripts/rls/setup-db.mjs

npx vitest run tests/identity "$@"
