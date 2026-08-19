#!/bin/sh
# ═══════════════════════════════════════════════════════════════
# Push Notification Service — migration runner. Runs on EVERY
# `docker compose up`. Re-applies supabase/schema.sql (safe — it's written
# with IF NOT EXISTS / ADD COLUMN IF NOT EXISTS throughout, per its own
# header comment), then refreshes PostgREST's grants + schema cache.
#
# Simpler than DH-HRMS's checksum-tracked multi-file migrator because this
# app has a single evolving schema.sql, not a long append-only migration
# history — re-running the whole file is the pattern its own author intended
# ("Run supabase/schema.sql in the Supabase SQL editor").
# ═══════════════════════════════════════════════════════════════

set -e

PSQL="psql -v ON_ERROR_STOP=1 -U $POSTGRES_USER -h $POSTGRES_HOST -d $POSTGRES_DB"

until pg_isready -h "$POSTGRES_HOST" -U "$POSTGRES_USER" >/dev/null 2>&1; do
  echo "  waiting for postgres..."
  sleep 2
done

echo "▶ Applying supabase/schema.sql..."
$PSQL -v ON_ERROR_STOP=0 -f /migrations/schema.sql

echo "▶ Refreshing grants for service_role (RLS is enabled with zero policies on"
echo "  every app table — service_role's BYPASSRLS is the only way in, matching"
echo "  the app's own architecture: all access goes through server-side API"
echo "  routes using the service-role key, never direct client table access)..."
$PSQL <<'EOSQL'
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
EOSQL

echo "▶ Reloading PostgREST schema cache..."
$PSQL -c "NOTIFY pgrst, 'reload schema';"

echo "  done"
