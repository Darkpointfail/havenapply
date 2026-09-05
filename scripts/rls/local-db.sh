#!/usr/bin/env bash
#
# Ephemeral Supabase Postgres for the RLS suite.
#
# Runs the same image Supabase runs (`supabase/postgres`), so `auth.uid()`,
# the `anon` / `authenticated` / `service_role` roles and the default grants
# behave exactly as they do on a hosted project. Nothing here touches a remote
# project: the container is created empty and thrown away.
#
#   scripts/rls/local-db.sh up     start the container and wait for readiness
#   scripts/rls/local-db.sh down   remove it
#   scripts/rls/local-db.sh url    print the connection string
#
set -euo pipefail

IMAGE="${RLS_DB_IMAGE:-public.ecr.aws/supabase/postgres:17.6.1.011}"
NAME="${RLS_DB_CONTAINER:-haven-rls-pg}"
PORT="${RLS_DB_PORT:-54329}"
URL="postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres"

case "${1:-up}" in
  up)
    if [ -n "$(docker ps -q -f "name=^${NAME}$")" ]; then
      echo "${NAME} already running on port ${PORT}" >&2
    else
      docker rm -f "${NAME}" >/dev/null 2>&1 || true
      docker run -d --name "${NAME}" \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=postgres \
        -p "${PORT}:5432" \
        "${IMAGE}" >/dev/null
      printf 'waiting for %s' "${NAME}" >&2
      for _ in $(seq 1 60); do
        if docker exec "${NAME}" pg_isready -U postgres -q >/dev/null 2>&1; then
          printf ' ready\n' >&2
          break
        fi
        printf '.' >&2
        sleep 2
      done
      # pg_isready flips true during the init bootstrap restart; give the final
      # startup a moment before the first client connection.
      sleep 3
    fi
    echo "${URL}"
    ;;
  down)
    docker rm -f "${NAME}" >/dev/null 2>&1 || true
    ;;
  url)
    echo "${URL}"
    ;;
  *)
    echo "usage: $0 {up|down|url}" >&2
    exit 64
    ;;
esac
