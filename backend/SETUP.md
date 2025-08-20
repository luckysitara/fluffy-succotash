# Backend Setup Guide

## Prerequisites

1. **Python 3.8+** installed
2. **PostgreSQL 12+** installed and running
3. **Git** (optional, for version control)

## Quick Setup

### 1. Database Setup

First, make sure PostgreSQL is running and create a database:

\`\`\`sql
-- Connect to PostgreSQL as superuser
sudo -u postgres psql

-- Create database and user
CREATE DATABASE osint_platform;
CREATE USER osint_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE osint_platform TO osint_user;
\q
\`\`\`

### 2. Environment Configuration

Create a `.env` file in the backend directory:

\`\`\`bash
cp .env.example .env
\`\`\`

Edit the `.env` file with your database credentials:

\`\`\`env
DATABASE_URL=postgresql://osint_user:your_password@localhost:5432/osint_platform
SECRET_KEY=your-super-secret-key-change-this-in-production-make-it-very-long-and-random
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
\`\`\`

### 3. Run Setup Script

\`\`\`bash
chmod +x setup.sh
./setup.sh
\`\`\`

### 4. Start the Server

\`\`\`bash
source env/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
\`\`\`

## Manual Setup (Alternative)

If the setup script doesn't work, follow these manual steps:

### 1. Create Virtual Environment

\`\`\`bash
python3 -m venv env
source env/bin/activate
\`\`\`

### 2. Install Dependencies

\`\`\`bash
pip install -r requirements.txt
\`\`\`

### 3. Setup Database

\`\`\`bash
python setup_database.py
\`\`\`

### 4. Create Admin User

\`\`\`bash
python create_admin.py
\`\`\`

### 5. Start Server

\`\`\`bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
\`\`\`

## Default Credentials

- **Username**: admin
- **Password**: admin123

⚠️ **Important**: Change the default password after first login!

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Troubleshooting

### Database Connection Issues

1. Make sure PostgreSQL is running:
   \`\`\`bash
   sudo systemctl status postgresql
   \`\`\`

2. Test database connection:
   \`\`\`bash
   psql -h localhost -U osint_user -d osint_platform
   \`\`\`

3. Check your `.env` file has correct credentials

### Permission Issues

Make sure the database user has proper permissions:
\`\`\`sql
GRANT ALL PRIVILEGES ON DATABASE osint_platform TO osint_user;
GRANT ALL ON SCHEMA public TO osint_user;
\`\`\`

### Port Already in Use

If port 8000 is busy, use a different port:
\`\`\`bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
\`\`\`

## Development

For development, the server will auto-reload on code changes. The API will be available at:
- **Base URL**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
