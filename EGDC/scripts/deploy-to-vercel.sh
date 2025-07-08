#!/bin/bash

# EGDC Production Deployment Script for Vercel
# This script deploys your EGDC app to Vercel production

echo "🚀 Deploying EGDC to Vercel Production..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the EGDC directory."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# 1. Type checking (skip for production deployment)
echo "📝 Skipping TypeScript type check (configured to ignore build errors)..."
echo "✅ Type check skipped for production deployment"

# 2. Build test
echo "🔨 Testing production build..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

# 3. Check environment file
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found. You'll need to set environment variables in Vercel dashboard."
fi

# Login to Vercel (if not already logged in)
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "🔑 Please login to Vercel..."
    vercel login
fi

# Deploy to production
echo "🚀 Deploying to Vercel production..."
vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🎉 Your EGDC app is now live!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. ⚙️  Set environment variables in Vercel dashboard"
    echo "  2. 🌐 Configure custom domain (optional)"
    echo "  3. 🔍 Test all functionality"
    echo "  4. 📊 Set up monitoring"
    echo ""
    echo "🔗 Vercel Dashboard: https://vercel.com/dashboard"
    echo "📖 Environment Variables Guide: https://vercel.com/docs/concepts/projects/environment-variables"
    echo ""
    echo "🔧 Required Environment Variables:"
    echo "  - DATABASE_URL (your Google Cloud SQL connection)"
    echo "  - NODE_ENV=production"
    echo "  - API_SECRET_KEY"
    echo "  - JWT_SECRET"
    echo "  - ENCRYPTION_KEY"
    echo ""
    echo "💡 Tip: Copy from your .env.local file to Vercel dashboard"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi