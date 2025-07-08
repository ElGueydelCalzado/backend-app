#!/bin/bash

# Setup Production Environment Variables
# This script helps you prepare environment variables for production deployment

echo "🔧 Setting up production environment variables..."

# Create production environment file
if [ ! -f ".env.production.local" ]; then
    echo "📝 Creating .env.production.local file..."
    
    cat > .env.production.local << 'EOF'
# EGDC Production Environment Variables
# Copy these values to your deployment platform (Vercel, Railway, etc.)

# Database Configuration (Google Cloud SQL)
DATABASE_URL=postgresql://egdc_user:EgdcSecure2024!@34.45.148.180:5432/egdc_inventory?sslmode=require

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app

# Security Keys (CHANGE THESE IN PRODUCTION!)
API_SECRET_KEY=change-this-to-a-secure-random-string
JWT_SECRET=change-this-to-another-secure-random-string
ENCRYPTION_KEY=change-this-to-a-32-character-string

# Optional: Monitoring and Logging
# SENTRY_DSN=your-sentry-dsn-here
# DATADOG_API_KEY=your-datadog-api-key-here

# Optional: Email Configuration
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password

# Feature Flags
ENABLE_RATE_LIMITING=true
ENABLE_AUDIT_LOGGING=true
ENABLE_SECURITY_HEADERS=true
EOF

    echo "✅ Created .env.production.local"
else
    echo "✅ .env.production.local already exists"
fi

# Generate secure random keys
echo "🔐 Generating secure random keys..."

API_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 16)

echo ""
echo "🔑 Generated secure keys for production:"
echo "----------------------------------------"
echo "API_SECRET_KEY=$API_SECRET"
echo "JWT_SECRET=$JWT_SECRET"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo "----------------------------------------"
echo ""
echo "⚠️  IMPORTANT: Copy these keys to your deployment platform!"
echo ""

# Create environment variables checklist
cat > production-env-checklist.md << 'EOF'
# Production Environment Variables Checklist

## Required Variables ✅

Copy these to your deployment platform (Vercel/Railway/etc.):

### Database
- [ ] `DATABASE_URL` - Your Google Cloud SQL connection string
- [ ] `NODE_ENV=production`

### Security (Use generated keys above)
- [ ] `API_SECRET_KEY` - Generated secure key
- [ ] `JWT_SECRET` - Generated secure key  
- [ ] `ENCRYPTION_KEY` - Generated secure key

### Application
- [ ] `NEXT_PUBLIC_APP_URL` - Your app's production URL

### Optional Monitoring
- [ ] `SENTRY_DSN` - Error tracking (optional)
- [ ] `DATADOG_API_KEY` - Performance monitoring (optional)

### Feature Flags
- [ ] `ENABLE_RATE_LIMITING=true`
- [ ] `ENABLE_AUDIT_LOGGING=true`
- [ ] `ENABLE_SECURITY_HEADERS=true`

## Deployment Platforms

### Vercel
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable above

### Railway
1. Go to: https://railway.app/dashboard
2. Select your project
3. Go to Variables tab
4. Add each variable above

### Google Cloud Run
1. Use: `gcloud run deploy --set-env-vars`
2. Or set in Cloud Console

## Security Notes
- ✅ Never commit .env files to git
- ✅ Use different keys for development and production
- ✅ Rotate keys regularly
- ✅ Monitor for unauthorized access
EOF

echo "📋 Created production-env-checklist.md"
echo ""
echo "🎯 Next Steps:"
echo "  1. 📝 Edit .env.production.local with your actual values"
echo "  2. 🔑 Use the generated secure keys above"
echo "  3. 📋 Follow production-env-checklist.md"
echo "  4. 🚀 Deploy with: ./scripts/deploy-to-vercel.sh"
echo ""
echo "💡 Remember: Never commit .env files to git!"