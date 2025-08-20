import sys
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.database import SessionLocal, engine
from app.models.user import User, UserRole
from app.core.security import get_password_hash

def create_admin_user():
    db = SessionLocal()
    try:
        # Test database connection
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        
        # Check if Super Admin user already exists
        super_admin = db.query(User).filter(User.username == "superadmin").first()
        if super_admin:
            print("Super Admin user already exists!")
            print("Username: superadmin")
            print("Email: superadmin@osint-platform.com")
            return
        
        # Create Super Admin user (not associated with any organization)
        super_admin_user = User(
            username="superadmin",
            email="superadmin@osint-platform.com",
            hashed_password=get_password_hash("superadmin123"),
            full_name="Super Administrator",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
            organization_id=None
        )
        
        db.add(super_admin_user)
        db.commit()
        print("Super Admin user created successfully!")
        print("Username: superadmin")
        print("Password: superadmin123")
        print("⚠️  Important: Change the default password after first login!")
        
    except Exception as e:
        print(f"Error creating Super Admin user: {e}")
        print("Make sure the database is set up and running.")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
