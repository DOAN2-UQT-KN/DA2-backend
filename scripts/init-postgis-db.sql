-- Local PostGIS instance: bootstrap all service databases (local dev)
SELECT 'CREATE DATABASE identitydb'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'identitydb')\gexec

SELECT 'CREATE DATABASE incidentdb'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'incidentdb')\gexec

SELECT 'CREATE DATABASE notificationdb'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'notificationdb')\gexec

SELECT 'CREATE DATABASE rewarddb'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'rewarddb')\gexec

SELECT 'CREATE DATABASE aidb'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'aidb')\gexec

\connect identitydb
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\connect incidentdb
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\connect notificationdb
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\connect rewarddb
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\connect aidb
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
