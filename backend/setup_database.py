from sqlalchemy import text
from app.database.database import engine, SessionLocal
from app.models import user, case, evidence, audit_log

def setup_database():
    print("Creating database tables...")
    
    # Test database connection
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"Connected to PostgreSQL: {version}")
    except Exception as e:
        print(f"Error connecting to database: {e}")
        print("Make sure PostgreSQL is running and the DATABASE_URL is correct in your .env file")
        return False
    
    # Create all tables
    try:
        from app.database.database import Base
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
        
        # Verify tables were created
        with engine.connect() as connection:
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """))
            tables = [row[0] for row in result.fetchall()]
            print(f"Created tables: {', '.join(tables)}")
            
        return True
    except Exception as e:
        print(f"Error creating tables: {e}")
        return False

if __name__ == "__main__":
    success = setup_database()
    if not success:
        exit(1)
