import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

# Fallback to local postgres if POSTGRES_URL is not set or running outside docker
POSTGRES_URL = os.getenv("POSTGRES_URL", "postgresql://root:password@localhost:5432/proposal_db")

def get_db_connection():
    """Establish and return a connection to the PostgreSQL database."""
    conn = psycopg2.connect(POSTGRES_URL)
    return conn

def get_db_cursor(conn):
    """Return a dictionary cursor for ease of column access."""
    return conn.cursor(cursor_factory=RealDictCursor)
