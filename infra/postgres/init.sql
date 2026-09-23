-- ─────────────────────────────────────────────────────────────────
--  Noryvanta Business Marketplace Platform
--  PostgreSQL Initialization Script
--  Run automatically by Docker on first container startup.
-- ─────────────────────────────────────────────────────────────────

-- Ensure the noryvanta database and user exist
-- (Docker creates these via POSTGRES_DB / POSTGRES_USER env vars;
--  this script adds any additional extensions needed by the platform.)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable fuzzy string matching (used for product search)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable case-insensitive text type
CREATE EXTENSION IF NOT EXISTS "citext";

-- ─── Schema ownership ─────────────────────────────────────────
-- Grant all schema privileges to the noryvanta application user
GRANT ALL PRIVILEGES ON DATABASE noryvanta TO noryvanta;
GRANT ALL ON SCHEMA public TO noryvanta;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO noryvanta;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO noryvanta;

-- ─── Audit settings ───────────────────────────────────────────
-- Log all DDL statements for change auditing
ALTER DATABASE noryvanta SET log_statement = 'ddl';

-- ─── Timezone ─────────────────────────────────────────────────
ALTER DATABASE noryvanta SET timezone TO 'Asia/Kolkata';

-- NOTE: Application tables are created and managed by Alembic migrations.
-- This script only handles PostgreSQL extensions and permissions.
