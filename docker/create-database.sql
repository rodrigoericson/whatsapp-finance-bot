SELECT 'CREATE DATABASE whatsapp_bot'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'whatsapp_bot')\gexec
