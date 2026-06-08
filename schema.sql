-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create proposals table
CREATE TABLE IF NOT EXISTS proposals (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    pricing JSONB,
    timeline JSONB,
    risks JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table for security module
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Create HNSW index on embedding column using cosine distance
CREATE INDEX IF NOT EXISTS proposals_embedding_hnsw_idx 
ON proposals USING hnsw (embedding vector_cosine_ops);

-- Create user 'root' with password 'password' if not exists and grant superuser privileges
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'root') THEN
        CREATE ROLE root WITH LOGIN PASSWORD 'password' SUPERUSER;
    END IF;
END
$$;

-- Grant all privileges to user 'root'
GRANT ALL PRIVILEGES ON DATABASE proposal_db TO root;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO root;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO root;
