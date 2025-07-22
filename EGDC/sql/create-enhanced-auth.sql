-- ENHANCED AUTHENTICATION SYSTEM
-- Support for multiple authentication methods: email/password, phone/SMS, OAuth, magic links

-- Create SMS verification codes table
CREATE TABLE IF NOT EXISTS sms_verification_codes (
    id VARCHAR(50) PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for SMS codes
CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON sms_verification_codes(phone);
CREATE INDEX IF NOT EXISTS idx_sms_codes_expires ON sms_verification_codes(expires_at);

-- Add phone and password fields to users table if they don't exist
DO $$
BEGIN
    -- Add phone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20) UNIQUE;
    END IF;
    
    -- Add password_hash column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'password_hash') THEN
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
    END IF;
    
    -- Add authentication provider info
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'auth_provider') THEN
        ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'email';
    END IF;
    
    -- Add email verification status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add phone verification status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'phone_verified') THEN
        ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create authentication logs table for security tracking
CREATE TABLE IF NOT EXISTS auth_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    email VARCHAR(255),
    phone VARCHAR(20),
    auth_method VARCHAR(50) NOT NULL, -- email, phone, google, apple, magic-link
    action VARCHAR(50) NOT NULL, -- login, logout, signup, failed_login, password_reset
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    tenant_id UUID REFERENCES tenants(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for auth logs
CREATE INDEX IF NOT EXISTS idx_auth_logs_user ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_email ON auth_logs(email);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created ON auth_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_logs_tenant ON auth_logs(tenant_id);

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for password reset tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);

-- Create email verification tokens table (for magic links)
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for email verification tokens
CREATE INDEX IF NOT EXISTS idx_email_verification_email ON email_verification_tokens(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON email_verification_tokens(expires_at);

-- Create OAuth accounts table (for linking multiple OAuth providers)
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- google, apple, microsoft, etc.
    provider_account_id VARCHAR(255) NOT NULL,
    provider_account_email VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, provider_account_id)
);

-- Create indexes for OAuth accounts
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider, provider_account_id);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Clean up expired SMS codes
    DELETE FROM sms_verification_codes WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up expired password reset tokens
    DELETE FROM password_reset_tokens WHERE expires_at < NOW();
    
    -- Clean up expired email verification tokens
    DELETE FROM email_verification_tokens WHERE expires_at < NOW();
    
    -- Clean up old auth logs (keep 90 days)
    DELETE FROM auth_logs WHERE created_at < NOW() - INTERVAL '90 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to log authentication events
CREATE OR REPLACE FUNCTION log_auth_event(
    p_user_id UUID,
    p_email VARCHAR(255),
    p_phone VARCHAR(20),
    p_auth_method VARCHAR(50),
    p_action VARCHAR(50),
    p_ip_address INET,
    p_user_agent TEXT,
    p_success BOOLEAN,
    p_failure_reason TEXT DEFAULT NULL,
    p_tenant_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO auth_logs (
        user_id, email, phone, auth_method, action, 
        ip_address, user_agent, success, failure_reason, tenant_id
    ) VALUES (
        p_user_id, p_email, p_phone, p_auth_method, p_action,
        p_ip_address, p_user_agent, p_success, p_failure_reason, p_tenant_id
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Create security view for authentication monitoring
CREATE OR REPLACE VIEW auth_security_summary AS
SELECT 
    DATE(created_at) as date,
    auth_method,
    action,
    COUNT(*) as total_attempts,
    COUNT(*) FILTER (WHERE success = TRUE) as successful_attempts,
    COUNT(*) FILTER (WHERE success = FALSE) as failed_attempts,
    COUNT(DISTINCT COALESCE(email, phone)) as unique_users,
    ROUND(COUNT(*) FILTER (WHERE success = TRUE) * 100.0 / COUNT(*), 2) as success_rate
FROM auth_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), auth_method, action
ORDER BY date DESC, auth_method, action;

-- Create view for suspicious activities
CREATE OR REPLACE VIEW auth_suspicious_activities AS
WITH failed_attempts AS (
    SELECT 
        COALESCE(email, phone) as identifier,
        ip_address,
        COUNT(*) as failed_count,
        MAX(created_at) as last_attempt
    FROM auth_logs 
    WHERE success = FALSE 
    AND created_at >= NOW() - INTERVAL '1 hour'
    GROUP BY COALESCE(email, phone), ip_address
    HAVING COUNT(*) >= 5
)
SELECT 
    identifier,
    ip_address,
    failed_count,
    last_attempt,
    'Multiple failed login attempts' as alert_type
FROM failed_attempts
ORDER BY failed_count DESC, last_attempt DESC;

-- Update users table constraints
ALTER TABLE users 
ADD CONSTRAINT check_auth_provider CHECK (auth_provider IN ('email', 'phone', 'google', 'apple', 'microsoft', 'magic-link'));

-- Add constraint to ensure either email or phone is provided
ALTER TABLE users 
ADD CONSTRAINT check_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL);

-- Create trigger to update user verification status
CREATE OR REPLACE FUNCTION update_user_verification()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-verify OAuth users
    IF NEW.auth_provider IN ('google', 'apple', 'microsoft') THEN
        NEW.email_verified = TRUE;
    END IF;
    
    -- Update timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_verification
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_user_verification();

-- Sample data for testing multiple auth methods
DO $$
BEGIN
    -- Insert test user with email/password authentication
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'test@example.com') THEN
        INSERT INTO users (
            tenant_id, email, name, role, auth_provider, 
            password_hash, email_verified, status, created_at, updated_at
        ) VALUES (
            '471e9c26-a232-46b3-a992-2932e5dfadf4', -- EGDC tenant
            'test@example.com',
            'Test User',
            'admin',
            'email',
            '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqVYCEHZKBGFWCS', -- password: 'password123'
            TRUE,
            'active',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Test user created: test@example.com (password: password123)';
    END IF;
    
    -- Insert test user with phone authentication
    IF NOT EXISTS (SELECT 1 FROM users WHERE phone = '+1234567890') THEN
        INSERT INTO users (
            tenant_id, phone, name, role, auth_provider,
            phone_verified, status, created_at, updated_at
        ) VALUES (
            '471e9c26-a232-46b3-a992-2932e5dfadf4', -- EGDC tenant
            '+1234567890',
            'Phone User',
            'admin', 
            'phone',
            TRUE,
            'active',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Test phone user created: +1234567890';
    END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON sms_verification_codes TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_logs TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON password_reset_tokens TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_verification_tokens TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON oauth_accounts TO PUBLIC;
GRANT SELECT ON auth_security_summary TO PUBLIC;
GRANT SELECT ON auth_suspicious_activities TO PUBLIC;

RAISE NOTICE '✅ Enhanced Authentication System created successfully!';
RAISE NOTICE 'Features: Multi-method auth, security logging, token management, suspicious activity detection';
RAISE NOTICE 'Supported methods: Email/Password, Phone/SMS, Google, Apple, Magic Links';
RAISE NOTICE 'Test accounts created: test@example.com (password123), +1234567890 (SMS)';