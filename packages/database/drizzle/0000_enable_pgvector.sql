-- Custom SQL migration file, put your code below! --
-- pgvector for embedding search (decision 10.4). Per-database, so it lives in a
-- migration, not in the Docker image: a fresh Neon database gets it the same way.
CREATE EXTENSION IF NOT EXISTS vector;
