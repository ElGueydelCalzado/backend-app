#!/bin/bash

# EGDC Supabase Export Script
# This script exports your data from Supabase to prepare for Google Cloud SQL migration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_PROJECT_ID="lvsrmbeyvktqylevjgdy"
EXPORT_DIR="./supabase_export"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}🚀 Starting Supabase data export for EGDC inventory system${NC}"

# Create export directory
mkdir -p "$EXPORT_DIR"

# You'll need to get your database password from Supabase dashboard
# Settings -> Database -> Database password
echo -e "${YELLOW}⚠️  You need your Supabase database password${NC}"
echo -e "${YELLOW}   1. Go to your Supabase dashboard: https://app.supabase.com/project/${SUPABASE_PROJECT_ID}/settings/database${NC}"
echo -e "${YELLOW}   2. Find your Database password${NC}"
echo -e "${YELLOW}   3. Enter it when prompted below${NC}"
echo

read -s -p "Enter your Supabase database password: " DB_PASSWORD
echo

# Database connection details
DB_HOST="db.${SUPABASE_PROJECT_ID}.supabase.co"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="postgres"

echo -e "${GREEN}📊 Exporting schema...${NC}"

# Export schema only (structure)
/usr/local/opt/postgresql@14/bin/pg_dump \
  "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  --file="${EXPORT_DIR}/supabase_schema_${TIMESTAMP}.sql"

echo -e "${GREEN}📦 Exporting data...${NC}"

# Export data only (without schema)
/usr/local/opt/postgresql@14/bin/pg_dump \
  "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
  --data-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  --file="${EXPORT_DIR}/supabase_data_${TIMESTAMP}.sql"

echo -e "${GREEN}🔍 Exporting specific tables for EGDC...${NC}"

# Export only the tables we need for EGDC
/usr/local/opt/postgresql@14/bin/pg_dump \
  "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
  --data-only \
  --no-owner \
  --no-privileges \
  --table=public.products \
  --table=public.change_logs \
  --file="${EXPORT_DIR}/egdc_tables_${TIMESTAMP}.sql"

echo -e "${GREEN}📋 Creating migration summary...${NC}"

# Create a summary file
cat > "${EXPORT_DIR}/migration_summary_${TIMESTAMP}.txt" << EOF
EGDC Supabase Export Summary
Generated: $(date)
Project ID: ${SUPABASE_PROJECT_ID}
Database: ${DB_NAME}

Files created:
- supabase_schema_${TIMESTAMP}.sql    (Complete database schema)
- supabase_data_${TIMESTAMP}.sql      (All data)
- egdc_tables_${TIMESTAMP}.sql        (EGDC-specific tables only)

Next steps:
1. Wait for Google Cloud SQL instance to be ready
2. Run the import script to load data into Cloud SQL
3. Update your application configuration
4. Test the migration

Connection details for Cloud SQL:
- Instance: egdc-inventory-db
- Database: egdc_inventory
- Region: us-central1
EOF

echo -e "${GREEN}✅ Export completed successfully!${NC}"
echo -e "${GREEN}📁 Files saved in: ${EXPORT_DIR}${NC}"
echo -e "${GREEN}📄 See migration_summary_${TIMESTAMP}.txt for details${NC}"

# Show file sizes
echo -e "${GREEN}📊 Export file sizes:${NC}"
ls -lh "${EXPORT_DIR}"/*${TIMESTAMP}*