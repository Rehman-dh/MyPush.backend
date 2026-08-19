-- ═══════════════════════════════════════════════════════════════
-- Self-hosted Supabase initialization — extensions + schemas + grants.
-- Roles (supabase_admin, authenticator, etc.) are created in scripts/bootstrap.sh
-- BEFORE this runs, using the POSTGRES_PASSWORD env var.
--
-- Simplified from the DH-HRMS pattern this was copied from: no Realtime, no
-- Storage, no pgvector — this app only needs Postgres + GoTrue (auth) +
-- PostgREST (rest). See supabase/schema.sql for the app's own tables.
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schemas used by the Supabase services actually in use here.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS extensions;

-- Auth admin needs ownership of auth schema
GRANT ALL PRIVILEGES ON SCHEMA auth TO supabase_auth_admin;
ALTER SCHEMA auth OWNER TO supabase_auth_admin;

-- GoTrue queries its own tables (flow_state, users, sessions, etc.) unqualified,
-- so the role's search_path MUST put "auth" first. Otherwise Postgres looks in
-- public and throws 'relation "flow_state" does not exist'.
ALTER ROLE supabase_auth_admin SET search_path = auth, public, extensions;

-- Postgres 15+ locks down the public schema by default.
-- Every role that needs to read/write public tables must be granted USAGE,
-- and anything that creates objects (like GoTrue's migrations touching public.*) needs CREATE.
GRANT USAGE, CREATE ON SCHEMA public TO supabase_auth_admin;
GRANT USAGE, CREATE ON SCHEMA public TO authenticator;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT CREATE ON SCHEMA public TO service_role;

-- Default privileges for public schema (so PostgREST sees new tables)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
