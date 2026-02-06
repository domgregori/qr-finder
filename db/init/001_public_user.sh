#!/bin/sh
set -e

PUBLIC_DB_PASSWORD="${PUBLIC_DB_PASSWORD:-public_app_password}"

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v dbname="$POSTGRES_DB" \
  -v public_db_password="$PUBLIC_DB_PASSWORD" <<'EOSQL'
SELECT format('CREATE ROLE public_app LOGIN PASSWORD %L', :'public_db_password')
WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'public_app')
\gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO public_app', :'dbname')
\gexec

GRANT USAGE ON SCHEMA public TO public_app;
EOSQL
