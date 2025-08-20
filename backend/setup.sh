#!/bin/bash

# OSINT Platform Backend Setup Script
echo "🚀 Setting up OSINT Platform Backend..."

# Check if Python 3.8+ is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check Python version
python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
required_version="3.8"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ Python $python_version is installed, but Python $required_version or higher is required."
    exit 1
fi

echo "✅ Python $python_version detected"

# Check if PostgreSQL is installed and running
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL 12 or higher."
    echo "   Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "   CentOS/RHEL: sudo yum install postgresql-server postgresql-contrib"
    echo "   macOS: brew install postgresql"
    exit 1
fi

echo "✅ PostgreSQL detected"

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL service."
    echo "   Ubuntu/Debian: sudo systemctl start postgresql"
    echo "   CentOS/RHEL: sudo systemctl start postgresql"
    echo "   macOS: brew services start postgresql"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv env

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source env/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit the .env file with your database credentials before continuing."
    echo "   Default database URL: postgresql://osint_user:your_password@localhost:5432/osint_platform"
    read -p "Press Enter after you've configured the .env file..."
fi

# Setup database
echo "🗄️  Setting up database..."
python setup_database.py

if [ $? -ne 0 ]; then
    echo "❌ Database setup failed. Please check your database configuration."
    exit 1
fi

# Create admin user
echo "👤 Creating admin user..."
python create_admin.py

if [ $? -ne 0 ]; then
    echo "❌ Admin user creation failed."
    exit 1
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Activate the virtual environment: source env/bin/activate"
echo "   2. Start the server: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
echo "   3. Visit http://localhost:8000/docs for API documentation"
echo ""
echo "🔐 Default admin credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo "   ⚠️  Change the password after first login!"
echo ""
echo "🔗 Useful URLs:"
echo "   API Documentation: http://localhost:8000/docs"
echo "   Alternative Docs: http://localhost:8000/redoc"
echo "   Health Check: http://localhost:8000/health"
