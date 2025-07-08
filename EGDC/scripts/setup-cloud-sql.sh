#!/bin/bash

# EGDC Cloud SQL Setup Script
# This script sets up your Google Cloud SQL instance for the EGDC inventory system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="egdc-test"
REGION="us-central1"
INSTANCE_NAME="egdc-inventory-db"
DB_NAME="egdc_inventory"
DB_USER="egdc_user"
DB_PASSWORD="EgdcSecure2024!"

echo -e "${GREEN}🚀 Setting up Google Cloud SQL for EGDC inventory system${NC}"

# Source gcloud
source ~/google-cloud-sdk/path.bash.inc

# Wait for instance to be ready
echo -e "${YELLOW}⏳ Waiting for Cloud SQL instance to be ready...${NC}"
while true; do
    STATE=$(gcloud sql instances describe $INSTANCE_NAME --format="value(state)")
    if [ "$STATE" = "RUNNABLE" ]; then
        echo -e "${GREEN}✅ Instance is ready!${NC}"
        break
    elif [ "$STATE" = "FAILED" ]; then
        echo -e "${RED}❌ Instance creation failed!${NC}"
        exit 1
    else
        echo -e "${YELLOW}   Current state: $STATE${NC}"
        sleep 30
    fi
done

# Create database
echo -e "${GREEN}📊 Creating database: $DB_NAME${NC}"
gcloud sql databases create $DB_NAME --instance=$INSTANCE_NAME || echo "Database might already exist"

# Create user
echo -e "${GREEN}👤 Creating user: $DB_USER${NC}"
gcloud sql users create $DB_USER --instance=$INSTANCE_NAME --password=$DB_PASSWORD || echo "User might already exist"

# Get connection info
echo -e "${GREEN}🔗 Getting connection information...${NC}"
CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE_NAME --format="value(connectionName)")
IP_ADDRESS=$(gcloud sql instances describe $INSTANCE_NAME --format="value(ipAddresses[0].ipAddress)")

echo -e "${GREEN}✅ Cloud SQL setup completed!${NC}"
echo -e "${GREEN}📋 Connection details:${NC}"
echo -e "   Instance: $INSTANCE_NAME"
echo -e "   Database: $DB_NAME"
echo -e "   User: $DB_USER"
echo -e "   Password: $DB_PASSWORD"
echo -e "   Connection Name: $CONNECTION_NAME"
echo -e "   IP Address: $IP_ADDRESS"

# Create .env.cloud file with new configuration
echo -e "${GREEN}📝 Creating .env.cloud configuration...${NC}"
cat > .env.cloud << EOF
# Google Cloud SQL Configuration
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

# Google Cloud settings
GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID
CLOUD_SQL_INSTANCE_NAME=$INSTANCE_NAME
CLOUD_SQL_CONNECTION_NAME=$CONNECTION_NAME
CLOUD_SQL_REGION=$REGION

# Database connection details
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Next.js
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

echo -e "${GREEN}📄 Configuration saved to .env.cloud${NC}"
echo -e "${GREEN}   You can copy this to .env.local when ready to switch${NC}"

# Instructions for next steps
echo -e "${GREEN}🔄 Next steps:${NC}"
echo -e "1. Start Cloud SQL Proxy: ./scripts/start-proxy.sh"
echo -e "2. Import your data: ./scripts/import-data.sh"
echo -e "3. Update .env.local with new configuration"
echo -e "4. Test the migration"