#!/bin/bash

# EGDC Production Readiness Test
# This script checks if your app is ready for production deployment

echo "🔍 Testing EGDC production readiness..."
echo "=================================="

ERRORS=0
WARNINGS=0

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to log error
log_error() {
    echo "❌ ERROR: $1"
    ((ERRORS++))
}

# Function to log warning
log_warning() {
    echo "⚠️  WARNING: $1"
    ((WARNINGS++))
}

# Function to log success
log_success() {
    echo "✅ $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log_error "package.json not found. Run this script from the EGDC directory."
    exit 1
fi

log_success "Found package.json"

# Check Node.js version
if command_exists node; then
    NODE_VERSION=$(node --version)
    log_success "Node.js version: $NODE_VERSION"
else
    log_error "Node.js not found"
fi

# Check npm dependencies
echo ""
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    log_success "node_modules directory exists"
else
    log_warning "node_modules not found. Run 'npm install'"
fi

# Check TypeScript compilation
echo ""
echo "📝 Testing TypeScript compilation..."
if npm run type-check > /dev/null 2>&1; then
    log_success "TypeScript compilation passed"
else
    log_error "TypeScript compilation failed. Run 'npm run type-check' for details"
fi

# Check production build
echo ""
echo "🔨 Testing production build..."
if npm run build > /dev/null 2>&1; then
    log_success "Production build successful"
else
    log_error "Production build failed. Run 'npm run build' for details"
fi

# Check environment configuration
echo ""
echo "⚙️ Checking environment configuration..."
if [ -f ".env.local" ]; then
    log_success "Found .env.local"
else
    log_warning ".env.local not found. You'll need environment variables for production"
fi

if [ -f ".env.production.local" ]; then
    log_success "Found .env.production.local"
else
    log_warning ".env.production.local not found. Run './scripts/setup-production-env.sh'"
fi

# Check database connection
echo ""
echo "🗄️ Testing database connection..."
if npx tsx scripts/test-connection.ts > /dev/null 2>&1; then
    log_success "Database connection successful"
else
    log_error "Database connection failed. Check your DATABASE_URL"
fi

# Check API endpoints
echo ""
echo "🌐 Testing API endpoints..."
if npm run dev > /dev/null 2>&1 & 
then
    DEV_PID=$!
    sleep 5
    
    if curl -s http://localhost:3000/api/inventory > /dev/null; then
        log_success "API endpoints responding"
    else
        log_warning "API endpoints not responding. Check server startup"
    fi
    
    kill $DEV_PID > /dev/null 2>&1
else
    log_warning "Could not start development server for testing"
fi

# Check for security configurations
echo ""
echo "🔐 Checking security configurations..."
if grep -q "secureEndpoint" app/api/inventory/route.ts; then
    log_success "Security middleware configured"
else
    log_warning "Security middleware not found in API routes"
fi

# Check for monitoring setup
echo ""
echo "📊 Checking monitoring setup..."
if [ -d "monitoring" ]; then
    log_success "Monitoring configuration found"
else
    log_warning "Monitoring configuration not found"
fi

# Check for backup scripts
echo ""
echo "💾 Checking backup configurations..."
if [ -f "scripts/setup-backup.sh" ]; then
    log_success "Backup scripts found"
else
    log_warning "Backup scripts not found"
fi

# Check deployment requirements
echo ""
echo "🚀 Checking deployment requirements..."
if command_exists vercel; then
    log_success "Vercel CLI available"
elif command_exists railway; then
    log_success "Railway CLI available"
else
    log_warning "No deployment CLI found. Install vercel or railway CLI"
fi

# Summary
echo ""
echo "=================================="
echo "📊 PRODUCTION READINESS SUMMARY"
echo "=================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "🎉 ALL CHECKS PASSED!"
    echo "✅ Your EGDC app is ready for production deployment!"
    echo ""
    echo "🚀 Next steps:"
    echo "  1. Run: ./scripts/setup-production-env.sh"
    echo "  2. Configure environment variables in your deployment platform"
    echo "  3. Run: ./scripts/deploy-to-vercel.sh"
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  WARNINGS FOUND: $WARNINGS"
    echo "✅ Your app can be deployed, but consider addressing warnings"
    echo ""
    echo "🚀 You can proceed with deployment:"
    echo "  1. Run: ./scripts/setup-production-env.sh"
    echo "  2. Run: ./scripts/deploy-to-vercel.sh"
else
    echo "❌ ERRORS FOUND: $ERRORS"
    echo "⚠️  WARNINGS FOUND: $WARNINGS"
    echo ""
    echo "🔧 Please fix the errors before deploying to production"
    echo ""
    echo "💡 Common fixes:"
    echo "  - Run: npm install"
    echo "  - Fix TypeScript errors: npm run type-check"
    echo "  - Fix build errors: npm run build"
    echo "  - Check database connection"
fi

echo ""
echo "📖 For deployment help, see: PRODUCTION-DEPLOYMENT.md"

exit $ERRORS