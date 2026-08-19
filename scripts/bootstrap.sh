#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Push Notification Service — Bootstrap. Runs ONCE on first Postgres
# container boot (Postgres init-scripts only run when the data dir is empty).
#
# Runs BEFORE GoTrue's own internal migrations connect, so the roles it
# expects (supabase_auth_admin, authenticator) already exist with the
# correct password (= $POSTGRES_PASSWORD).
#
# Pattern copied from DH-HRMS's self-hosted Supabase setup
# (Devhouse-assets/Web.Frontend.DH-HRMS), simplified: no Realtime, no
# Storage, no superadmin seed (the one existing admin account is restored
# separately from the migrated Supabase Auth data, not seeded fresh here).
# ═══════════════════════════════════════════════════════════════

set -e

PSQL="psql -v ON_ERROR_STOP=0 -U $POSTGRES_USER -d $POSTGRES_DB"

echo "▶ Step 0: Pre-creating Supabase roles with POSTGRES_PASSWORD..."
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL
  DO \$\$ BEGIN
    CREATE ROLE supabase_admin LOGIN SUPERUSER PASSWORD '$POSTGRES_PASSWORD';
  EXCEPTION WHEN duplicate_object THEN
    EXECUTE format('ALTER USER supabase_admin WITH PASSWORD %L', '$POSTGRES_PASSWORD');
  END \$\$;

  DO \$\$ BEGIN
    CREATE ROLE supabase_auth_admin LOGIN PASSWORD '$POSTGRES_PASSWORD';
  EXCEPTION WHEN duplicate_object THEN
    EXECUTE format('ALTER USER supabase_auth_admin WITH PASSWORD %L', '$POSTGRES_PASSWORD');
  END \$\$;

  DO \$\$ BEGIN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '$POSTGRES_PASSWORD';
  EXCEPTION WHEN duplicate_object THEN
    EXECUTE format('ALTER USER authenticator WITH PASSWORD %L', '$POSTGRES_PASSWORD');
  END \$\$;

  DO \$\$ BEGIN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;

  DO \$\$ BEGIN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;

  DO \$\$ BEGIN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;

  GRANT anon, authenticated, service_role TO authenticator;
EOSQL
echo "  ✓ Roles ready."

echo "▶ Step 1: Base init (extensions, schemas, grants)..."
$PSQL -f /migrations/000_init_self_hosted.sql || true

echo "▶ Step 2: App schema (tables, indexes, RLS)..."
$PSQL -f /migrations/schema.sql || true

echo "▶ BOOTSTRAP COMPLETE."
