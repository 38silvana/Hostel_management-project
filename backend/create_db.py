import psycopg2
from urllib.parse import quote_plus
from app.config import settings

def create_database_if_not_exists():
    try:
        # Connect to default 'postgres' database first
        conn = psycopg2.connect(
            dbname="postgres",
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            host=settings.POSTGRES_HOST,
            port=settings.POSTGRES_PORT
        )
        conn.autocommit = True
        cursor = conn.cursor()

        # Check if database hostel_management exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (settings.POSTGRES_DB,))
        exists = cursor.fetchone()

        if not exists:
            cursor.execute(f'CREATE DATABASE "{settings.POSTGRES_DB}";')
            print(f" Database '{settings.POSTGRES_DB}' created successfully!")
        else:
            print(f" Database '{settings.POSTGRES_DB}' already exists.")

        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f" Failed to create database '{settings.POSTGRES_DB}': {e}")
        return False

if __name__ == "__main__":
    create_database_if_not_exists()
