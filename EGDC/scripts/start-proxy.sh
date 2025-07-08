#!/bin/bash

# EGDC Cloud SQL Proxy Startup Script
# This script starts the Cloud SQL Proxy for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="egdc-test"
INSTANCE_NAME="egdc-inventory-db"
REGION="us-central1"

echo -e "${GREEN}🔗 Starting Cloud SQL Proxy for EGDC inventory system${NC}"

# Source gcloud
source ~/google-cloud-sdk/path.bash.inc

# Get connection name
CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE_NAME --format="value(connectionName)")

echo -e "${GREEN}📡 Connection Name: $CONNECTION_NAME${NC}"

# Kill any existing proxy
pkill -f cloud_sql_proxy || true

# Start the proxy
echo -e "${GREEN}🚀 Starting Cloud SQL Proxy...${NC}"
echo -e "${YELLOW}   This will run in the background${NC}"
echo -e "${YELLOW}   Press Ctrl+C to stop${NC}"

gcloud sql connect $INSTANCE_NAME --user=egdc_user --database=egdc_inventory