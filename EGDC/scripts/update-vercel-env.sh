#!/bin/bash

# Update Vercel environment variables with new database password
echo "🔧 Updating Vercel environment variables..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install with: npm install -g vercel"
    echo "🔗 Or update manually at: https://vercel.com/dashboard"
    exit 1
fi

# Update DATABASE_URL with new password
echo "📝 Updating DATABASE_URL..."
vercel env rm DATABASE_URL production --yes
vercel env add DATABASE_URL production --value="postgresql://egdc_user:egdc1!@34.45.148.180:5432/egdc_inventory?sslmode=require"

echo "✅ Environment variable updated!"
echo "🚀 Triggering redeploy..."

# Trigger a new deployment
vercel --prod

echo "✅ Deployment complete!"
echo "🔗 Check your app at: https://inv.elgueydelcalzado.com"