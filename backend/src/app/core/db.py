"""
Database Helper Module for File Management
"""
import psycopg
from psycopg.rows import dict_row
from .config import get_settings

def init_db():
    """Creates the user_files table if it doesn't exist yet."""
    settings = get_settings()
    with psycopg.connect(settings.database_url) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_files (
                    id SERIAL PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    upload_timestamp TIMESTAMPTZ DEFAULT NOW()
                );
            """)
        conn.commit()

def save_file_metadata(user_id: str, filename: str, file_path: str):
    """Saves a new uploaded file to the database."""
    settings = get_settings()
    with psycopg.connect(settings.database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO user_files (user_id, filename, file_path) VALUES (%s, %s, %s)",
                (user_id, filename, file_path)
            )
        conn.commit()

def get_user_files(user_id: str) -> list:
    """Fetches all files owned by a specific user."""
    settings = get_settings()
    with psycopg.connect(settings.database_url) as conn:
        # dict_row allows us to access column names like dictionary keys
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT id, filename, upload_timestamp FROM user_files WHERE user_id = %s ORDER BY upload_timestamp DESC",
                (user_id,)
            )
            return cur.fetchall()

def delete_user_file_metadata(user_id: str):
    """Deletes all database records for a specific user when they clear their data."""
    settings = get_settings()
    with psycopg.connect(settings.database_url) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_files WHERE user_id = %s", (user_id,))
        conn.commit()

def delete_specific_user_files(user_id: str, filenames: list):
    """Deletes specific files for a user from the Neon database."""
    if not filenames:
        return
        
    settings = get_settings()
    with psycopg.connect(settings.database_url) as conn:
        with conn.cursor() as cur:
            # We use ANY(%s) to match the list of filenames safely in PostgreSQL
            cur.execute(
                "DELETE FROM user_files WHERE user_id = %s AND filename = ANY(%s)",
                (user_id, filenames)
            )
        conn.commit()