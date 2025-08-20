# OSINT Platform Backend Setup Instructions

This guide will help you set up the OSINT Platform backend with UUID-based security and organization dropdown functionality.

## Prerequisites

- Python 3.8 or higher
- PostgreSQL 12 or higher
- Git

## Step 1: Clone and Setup Environment

\`\`\`bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd osint-platform/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
\`\`\`

## Step 2: PostgreSQL Database Setup

### Install PostgreSQL
- **Windows**: Download from https://www.postgresql.org/download/windows/
- **macOS**: `brew install postgresql`
- **Ubuntu/Debian**: `sudo apt-get install postgresql postgresql-contrib`

### Create Database and User

1. Connect to PostgreSQL as superuser:
\`\`\`bash
# On most systems:
sudo -u postgres psql

# On Windows (if postgres user doesn't exist):
psql -U postgres
\`\`\`

2. Run the initialization script:
\`\`\`sql
-- Create database
CREATE DATABASE osint_platform;

-- Create user
CREATE USER osint_user WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE osint_platform TO osint_user;

-- Connect to the new database
\c osint_platform;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO osint_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO osint_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO osint_user;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\`\`\`

3. Exit PostgreSQL:
\`\`\`sql
\q
\`\`\`

## Step 3: Environment Configuration

Create a `.env` file in the backend directory:

\`\`\`bash
# Database Configuration
DATABASE_URL=postgresql://osint_user:your_secure_password_here@localhost:5432/osint_platform

# Security Configuration
SECRET_KEY=your-super-secret-key-here-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Upload Configuration
UPLOAD_DIRECTORY=./uploads

# API Configuration
API_V1_STR=/api/v1
PROJECT_NAME=OSINT Platform
\`\`\`

**Important**: Replace `your_secure_password_here` and `your-super-secret-key-here-change-this-in-production` with secure values.

## Step 4: Initialize Database Schema

Run the database setup script:

\`\`\`bash
python setup_database.py
\`\`\`

This will create all the necessary tables with UUID primary keys and proper relationships.

## Step 5: Create Super Admin User

Create the initial super admin user:

\`\`\`bash
python create_admin.py
\`\`\`

This will create a super admin user with:
- Username: `superadmin`
- Password: `superadmin123`
- Email: `superadmin@osint-platform.com`

**⚠️ Important**: Change the default password immediately after first login!

## Step 6: Create Upload Directory

\`\`\`bash
mkdir uploads
\`\`\`

## Step 7: Start the Application

\`\`\`bash
# Development mode with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or use the provided script
chmod +x setup.sh
./setup.sh
\`\`\`

The API will be available at:
- Main API: http://localhost:8000
- Interactive API docs: http://localhost:8000/docs
- Alternative API docs: http://localhost:8000/redoc

## Step 8: Test the Setup

### 1. Test Super Admin Login
\`\`\`bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=superadmin&password=superadmin123"
\`\`\`

### 2. Create a Test Organization
\`\`\`bash
# First, get the access token from login response
TOKEN="your_access_token_here"

curl -X POST "http://localhost:8000/api/v1/organizations/" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Organization",
       "description": "A test organization for development",
       "plan": "free"
     }'
\`\`\`

### 3. Test Organization Dropdown Endpoint
\`\`\`bash
curl -X GET "http://localhost:8000/api/v1/organizations/simple" \
     -H "Authorization: Bearer $TOKEN"
\`\`\`

## Key Features Implemented

### 1. UUID-Based Security
- All primary keys use UUIDs instead of sequential integers
- Prevents information leakage and enumeration attacks
- Better security for distributed systems

### 2. Organization Dropdown Support
- New `/api/v1/organizations/simple` endpoint for dropdown data
- Returns only active organizations with minimal data
- Proper authorization (Super Admin and Org Admin only)

### 3. Enhanced User Creation
- Organization selection via UUID instead of manual input
- Proper validation and authorization
- Audit logging for all operations

### 4. Improved Database Schema
- UUID primary keys with `gen_random_uuid()` default
- Proper foreign key relationships
- Performance indexes on commonly queried fields
- Comprehensive audit trail

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login

### Organizations
- `GET /api/v1/organizations/` - List all organizations (Super Admin)
- `GET /api/v1/organizations/simple` - Get organizations for dropdown
- `POST /api/v1/organizations/` - Create organization (Super Admin)
- `PUT /api/v1/organizations/{id}` - Update organization (Super Admin)
- `DELETE /api/v1/organizations/{id}` - Delete organization (Super Admin)

### Users
- `GET /api/v1/users/me` - Get current user
- `GET /api/v1/users/` - List users
- `POST /api/v1/users/` - Create user (with organization dropdown)
- `PUT /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Delete user

### Cases
- `GET /api/v1/cases/` - List cases
- `POST /api/v1/cases/` - Create case
- `GET /api/v1/cases/{id}` - Get case details
- `PUT /api/v1/cases/{id}` - Update case
- `DELETE /api/v1/cases/{id}` - Delete case

### Evidence
- `POST /api/v1/evidence/` - Upload evidence
- `GET /api/v1/evidence/case/{case_id}` - Get case evidence
- `GET /api/v1/evidence/{id}` - Get evidence details
- `PUT /api/v1/evidence/{id}` - Update evidence
- `DELETE /api/v1/evidence/{id}` - Delete evidence

### Audit Logs
- `GET /api/v1/audit-logs/` - Get audit logs
- `GET /api/v1/audit-logs/stats` - Get audit statistics (Super Admin)

## Security Features

1. **JWT Token Authentication** with role and organization validation
2. **Password Change Tracking** for session invalidation
3. **Comprehensive Audit Logging** for all operations
4. **Role-Based Access Control** (RBAC)
5. **Organization-Based Data Isolation**
6. **UUID-Based Resource Identification**

## Troubleshooting

### Database Connection Issues
\`\`\`bash
# Test PostgreSQL connection
psql -U osint_user -d osint_platform -h localhost

# Check if PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS
\`\`\`

### Permission Issues
\`\`\`bash
# Fix upload directory permissions
chmod 755 uploads
\`\`\`

### Module Import Issues
\`\`\`bash
# Ensure you're in the backend directory and virtual environment is activated
pwd  # Should show .../osint-platform/backend
which python  # Should show virtual environment path
\`\`\`

## Production Deployment Notes

1. **Change Default Credentials**: Update super admin password immediately
2. **Secure Environment Variables**: Use proper secret management
3. **Database Security**: Use SSL connections and proper firewall rules
4. **File Upload Security**: Implement virus scanning and file type validation
5. **Rate Limiting**: Add rate limiting for API endpoints
6. **HTTPS**: Use HTTPS in production with proper SSL certificates
7. **Backup Strategy**: Implement regular database backups

## Next Steps

1. Test all API endpoints with the new UUID system
2. Verify organization dropdown functionality
3. Test user creation with organization selection
4. Validate audit logging is working correctly
5. Proceed with frontend integration once backend is confirmed working

The backend is now ready with UUID-based security and organization dropdown support!
