from psycopg2 import connect
from pgvector.psycopg2 import register_vector

def init_database():
    conn = connect("postgres://user:password@localhost:5432/proposal_db")
    register_vector(conn)
    conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
    conn.commit()