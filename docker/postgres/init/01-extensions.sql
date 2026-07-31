-- OpenEventHub PostgreSQL bootstrap
-- Runs once on first volume initialization.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

COMMENT ON DATABASE openeventhub IS 'OpenEventHub primary database';
