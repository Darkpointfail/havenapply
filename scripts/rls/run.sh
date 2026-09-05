#!/usr/bin/env bash
#
# One command, from nothing to a verdict:
#   1. start an ephemeral Supabase Postgres (empty),
#   2. apply every migration in order,
#   3. load the fictitious fixtures,
#   4. exercise the policies,
#   5. throw the container away.
#
# Keep the database alive for inspection with RLS_KEEP_DB=1.
#
set -euo pipefail

cd "$(dirname "$0")/../.."

KEEP="${RLS_KEEP_DB:-0}"

cleanup() {
  if [ "${KEEP}" != "1" ]; then
    bash scripts/rls/local-db.sh down
  else
    echo "database kept at $(bash scripts/rls/local-db.sh url)" >&2
  fi
}
trap cleanup EXIT

# A previous run must not colour this one: always start from an empty volume.
bash scripts/rls/local-db.sh down
RLS_TEST_DATABASE_URL="$(bash scripts/rls/local-db.sh up)"
export RLS_TEST_DATABASE_URL

node scripts/rls/setup-db.mjs
npx vitest run tests/rls "$@"
