#!/bin/bash

# Fix Vercel database connection issue
# This script adds Vercel IP ranges to Google Cloud SQL authorized networks

echo "🔧 Fixing Vercel database connection..."

PROJECT_ID="egdc-test"
INSTANCE_NAME="egdc-inventory-db"

# Allow all IPs for Vercel (temporary solution)
echo "🌐 Adding Vercel IP ranges to Cloud SQL..."

gcloud sql instances patch $INSTANCE_NAME \
    --authorized-networks=0.0.0.0/0 \
    --project=$PROJECT_ID

echo "✅ Database now accepts connections from all IPs (including Vercel)"
echo "⚠️  Note: This is a temporary solution for deployment testing"
echo ""
echo "🔐 For production security, you should:"
echo "  1. Use Cloud SQL Proxy"
echo "  2. Or configure specific Vercel IP ranges"
echo "  3. Enable SSL connections"