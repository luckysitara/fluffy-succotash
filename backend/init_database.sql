-- PostgreSQL Database Initialization Script
-- Run this script as a PostgreSQL superuser to set up the database

-- Create database
CREATE DATABASE osint_platform;

-- Create user
CREATE USER osint_user WITH PASSWORD 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE osint_platform TO osint_user;

-- Connect to the new database
\c osint_platform;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO osint_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO osint_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO osint_user;

-- Enable UUID extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language plpgsql;

-- Create organizations table with UUID primary key
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    plan VARCHAR(50) DEFAULT 'free' NOT NULL,
    max_users INTEGER DEFAULT 10 NOT NULL,
    max_cases INTEGER DEFAULT 50 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create users table with UUID primary key
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL, -- UUID foreign key
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create cases table with UUID primary key
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'OPEN' NOT NULL,
    priority VARCHAR(20) DEFAULT 'MEDIUM' NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE RESTRICT NOT NULL, -- UUID foreign key
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- UUID foreign key
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL, -- UUID foreign key
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Create evidence table with UUID primary key
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL, -- UUID foreign key
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500),
    file_hash VARCHAR(128),
    data_info JSONB,
    tags VARCHAR(500),
    is_verified BOOLEAN DEFAULT false NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL, -- UUID foreign key
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL, -- UUID foreign key
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table with UUID primary key
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- UUID foreign key
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL, -- UUID foreign key
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL, -- UUID foreign key
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID, -- Changed to UUID
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create case_assignments table for multiple user assignments
CREATE TABLE case_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(case_id, user_id)
);

-- Add triggers for updated_at columns
CREATE TRIGGER update_organizations_timestamp
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_cases_timestamp
    BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_evidence_timestamp
    BEFORE UPDATE ON evidence
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_audit_logs_timestamp
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Create indexes for better performance
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_cases_organization_id ON cases(organization_id);
CREATE INDEX idx_cases_created_by ON cases(created_by);
CREATE INDEX idx_cases_assigned_to ON cases(assigned_to);
CREATE INDEX idx_evidence_case_id ON evidence(case_id);
CREATE INDEX idx_evidence_organization_id ON evidence(organization_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Add indexes for case_assignments table
CREATE INDEX idx_case_assignments_case_id ON case_assignments(case_id);
CREATE INDEX idx_case_assignments_user_id ON case_assignments(user_id);
CREATE INDEX idx_case_assignments_assigned_by ON case_assignments(assigned_by);

COMMENT ON DATABASE osint_platform IS 'OSINT Platform Database for cybersecurity investigations with UUID-based security';
