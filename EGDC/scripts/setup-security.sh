#!/bin/bash

# Production Security Setup for EGDC
# This script configures security settings for the EGDC inventory management system

echo "🔐 Setting up production security for EGDC..."

# Check if gcloud CLI is available
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Set project ID
PROJECT_ID="egdc-test"
INSTANCE_NAME="egdc-inventory-db"
REGION="us-central1"

echo "🏗️  Configuring Cloud SQL security settings..."

# 1. Enable Cloud SQL Admin API
echo "📡 Enabling Cloud SQL Admin API..."
gcloud services enable sqladmin.googleapis.com --project=$PROJECT_ID

# 2. Configure SSL/TLS for Cloud SQL
echo "🔒 Configuring SSL/TLS for Cloud SQL..."
gcloud sql instances patch $INSTANCE_NAME \
    --require-ssl \
    --project=$PROJECT_ID

# 3. Create SSL certificates
echo "📜 Creating SSL certificates..."
gcloud sql ssl-certs create egdc-client-cert \
    --instance=$INSTANCE_NAME \
    --project=$PROJECT_ID

# 4. Download SSL certificates
echo "📥 Downloading SSL certificates..."
mkdir -p ssl-certs
gcloud sql ssl-certs describe egdc-client-cert \
    --instance=$INSTANCE_NAME \
    --project=$PROJECT_ID \
    --format="value(cert)" > ssl-certs/client-cert.pem

gcloud sql instances describe $INSTANCE_NAME \
    --project=$PROJECT_ID \
    --format="value(serverCaCert.cert)" > ssl-certs/server-ca.pem

# 5. Configure IP whitelist (restrict access)
echo "🛡️  Configuring IP whitelist..."
# Get current IP
CURRENT_IP=$(curl -s ifconfig.me)
echo "Current IP: $CURRENT_IP"

# Add current IP to authorized networks
gcloud sql instances patch $INSTANCE_NAME \
    --authorized-networks=$CURRENT_IP/32 \
    --project=$PROJECT_ID

# 6. Enable database audit logging
echo "📊 Enabling database audit logging..."
gcloud sql instances patch $INSTANCE_NAME \
    --database-flags=log_statement=all,log_duration=on,log_connections=on,log_disconnections=on \
    --project=$PROJECT_ID

# 7. Set up backup retention
echo "💾 Configuring backup retention..."
gcloud sql instances patch $INSTANCE_NAME \
    --backup-start-time=03:00 \
    --backup-location=$REGION \
    --retained-backups-count=7 \
    --project=$PROJECT_ID

# 8. Enable point-in-time recovery
echo "🔄 Enabling point-in-time recovery..."
gcloud sql instances patch $INSTANCE_NAME \
    --enable-point-in-time-recovery \
    --project=$PROJECT_ID

# 9. Configure database user permissions
echo "👤 Configuring database user permissions..."
# Create read-only user for monitoring
gcloud sql users create egdc_readonly \
    --instance=$INSTANCE_NAME \
    --password=ReadOnlySecure2024! \
    --project=$PROJECT_ID

# Grant read-only permissions
gcloud sql databases sql --instance=$INSTANCE_NAME --project=$PROJECT_ID <<EOF
GRANT CONNECT ON DATABASE egdc_inventory TO egdc_readonly;
GRANT USAGE ON SCHEMA public TO egdc_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO egdc_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO egdc_readonly;
EOF

echo "✅ Production security configuration completed!"
echo ""
echo "🔐 Security features enabled:"
echo "  ✅ SSL/TLS encryption required"
echo "  ✅ SSL certificates created"
echo "  ✅ IP whitelist configured"
echo "  ✅ Database audit logging enabled"
echo "  ✅ Automated backups configured"
echo "  ✅ Point-in-time recovery enabled"
echo "  ✅ Read-only user created"
echo ""
echo "📜 SSL certificates saved to: ssl-certs/"
echo "🌐 Authorized IP: $CURRENT_IP"
echo "👤 Read-only user: egdc_readonly"
echo ""
echo "⚠️  IMPORTANT: Update your .env.local with SSL configuration!"