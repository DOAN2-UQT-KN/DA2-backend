-- Initialize multiple databases for DA2 microservices
SELECT 'CREATE DATABASE identitydb'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'identitydb')\gexec

-- Add more databases here as needed:
-- SELECT 'CREATE DATABASE productdb'
-- WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'productdb')\gexec
