#!/bin/bash
set -e

: "${POSTGRES_USER:=postgres}"
: "${POSTGRES_PASSWORD:=}"
: "${POSTGRES_DB:=postgres}"

# This script runs inside the official postgres image during initialization.
# It ensures the configured POSTGRES_USER exists with superuser privileges
# and is the owner of the configured database.

psql -v ON_ERROR_STOP=1 --username "postgres" <<-EOSQL
DO
\$do\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${POSTGRES_USER}') THEN
       CREATE ROLE ${POSTGRES_USER} WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}';
   ELSE
       ALTER ROLE ${POSTGRES_USER} WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}';
   END IF;
   ALTER ROLE ${POSTGRES_USER} WITH SUPERUSER CREATEDB CREATEROLE INHERIT;
   PERFORM pg_catalog.set_config('search_path', '', false);
   GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB} TO ${POSTGRES_USER};
   ALTER DATABASE ${POSTGRES_DB} OWNER TO ${POSTGRES_USER};
END
\$do\$;
EOSQL
