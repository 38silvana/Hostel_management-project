import sys
from sqlalchemy import text
from app.config import settings
from app.database import engine

def test_connection():
    print("=" * 60)
    print(" Testing PostgreSQL Database Connection ")
    print("=" * 60)
    print(f" Host     : {settings.POSTGRES_HOST}")
    print(f" Port     : {settings.POSTGRES_PORT}")
    print(f" User     : {settings.POSTGRES_USER}")
    print(f" Database : {settings.POSTGRES_DB}")
    print("-" * 60)

    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version();"))
            db_version = result.scalar()
            print(" SUCCESS: Connected to PostgreSQL database successfully!")
            print(f" DB Version: {db_version}")
            print("=" * 60)
            return True
    except Exception as e:
        print(" ERROR: Failed to connect to PostgreSQL database.")
        print(f" Details: {e}")
        print("=" * 60)
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
