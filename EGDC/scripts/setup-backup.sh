#!/bin/bash

# Backup Setup for EGDC
# This script configures automated backups for the EGDC inventory management system

echo "💾 Setting up backup and monitoring for EGDC..."

# Configuration
PROJECT_ID="egdc-test"
INSTANCE_NAME="egdc-inventory-db"
REGION="us-central1"
BACKUP_BUCKET="gs://egdc-backups"
SERVICE_ACCOUNT="egdc-backup@${PROJECT_ID}.iam.gserviceaccount.com"

# Check if gcloud CLI is available
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
    exit 1
fi

echo "🔧 Configuring backup settings..."

# 1. Create backup bucket
echo "🪣 Creating backup storage bucket..."
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION $BACKUP_BUCKET 2>/dev/null || echo "Bucket already exists"

# 2. Create service account for backups
echo "👤 Creating service account for backups..."
gcloud iam service-accounts create egdc-backup \
    --display-name="EGDC Backup Service Account" \
    --description="Service account for automated backups" \
    --project=$PROJECT_ID 2>/dev/null || echo "Service account already exists"

# 3. Grant necessary permissions
echo "🔐 Granting permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/cloudsql.admin"

# 4. Configure automated backups
echo "📅 Configuring automated backups..."
gcloud sql instances patch $INSTANCE_NAME \
    --backup-start-time=03:00 \
    --backup-location=$REGION \
    --retained-backups-count=7 \
    --retained-transaction-log-days=7 \
    --project=$PROJECT_ID

# 5. Enable point-in-time recovery
echo "🔄 Enabling point-in-time recovery..."
gcloud sql instances patch $INSTANCE_NAME \
    --enable-point-in-time-recovery \
    --project=$PROJECT_ID

# 6. Create custom backup script
echo "📝 Creating custom backup script..."
cat > scripts/backup-database.sh << 'EOF'
#!/bin/bash

# Custom database backup script
# This script creates additional backups beyond the automated Cloud SQL backups

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/egdc_backups"
PROJECT_ID="egdc-test"
INSTANCE_NAME="egdc-inventory-db"
DATABASE_NAME="egdc_inventory"
BACKUP_BUCKET="gs://egdc-backups"

echo "🗄️  Creating database backup: $TIMESTAMP"

# Create backup directory
mkdir -p $BACKUP_DIR

# Export database
echo "📤 Exporting database..."
gcloud sql export sql $INSTANCE_NAME $BACKUP_BUCKET/database_backup_$TIMESTAMP.sql \
    --database=$DATABASE_NAME \
    --project=$PROJECT_ID

# Export specific tables
echo "📊 Exporting products table..."
gcloud sql export csv $INSTANCE_NAME $BACKUP_BUCKET/products_backup_$TIMESTAMP.csv \
    --database=$DATABASE_NAME \
    --query="SELECT * FROM products ORDER BY created_at DESC" \
    --project=$PROJECT_ID

echo "📋 Exporting change logs..."
gcloud sql export csv $INSTANCE_NAME $BACKUP_BUCKET/change_logs_backup_$TIMESTAMP.csv \
    --database=$DATABASE_NAME \
    --query="SELECT * FROM change_logs WHERE created_at >= NOW() - INTERVAL '7 days' ORDER BY created_at DESC" \
    --project=$PROJECT_ID

# Create backup manifest
echo "📋 Creating backup manifest..."
cat > $BACKUP_DIR/backup_manifest_$TIMESTAMP.json << EOL
{
  "timestamp": "$TIMESTAMP",
  "database": "$DATABASE_NAME",
  "instance": "$INSTANCE_NAME",
  "project": "$PROJECT_ID",
  "files": [
    "database_backup_$TIMESTAMP.sql",
    "products_backup_$TIMESTAMP.csv",
    "change_logs_backup_$TIMESTAMP.csv"
  ],
  "backup_type": "full",
  "retention_days": 30
}
EOL

# Upload manifest
gsutil cp $BACKUP_DIR/backup_manifest_$TIMESTAMP.json $BACKUP_BUCKET/manifests/

# Clean up local files
rm -rf $BACKUP_DIR

echo "✅ Backup completed: $TIMESTAMP"
echo "📍 Backup location: $BACKUP_BUCKET"
EOF

chmod +x scripts/backup-database.sh

# 7. Create monitoring script
echo "📊 Creating monitoring script..."
cat > scripts/monitor-system.sh << 'EOF'
#!/bin/bash

# System monitoring script for EGDC
# This script checks system health and sends alerts if needed

PROJECT_ID="egdc-test"
INSTANCE_NAME="egdc-inventory-db"
DATABASE_NAME="egdc_inventory"

echo "🔍 Monitoring EGDC system health..."

# Check database connectivity
echo "📡 Checking database connectivity..."
if gcloud sql connect $INSTANCE_NAME --user=egdc_user --database=$DATABASE_NAME --quiet <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connectivity: OK"
else
    echo "❌ Database connectivity: FAILED"
    # Send alert (implement your alerting mechanism here)
fi

# Check database size
echo "💾 Checking database size..."
DB_SIZE=$(gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID --format="value(settings.dataDiskSizeGb)")
echo "📊 Database size: ${DB_SIZE}GB"

# Check backup status
echo "🔄 Checking backup status..."
LAST_BACKUP=$(gcloud sql backups list --instance=$INSTANCE_NAME --project=$PROJECT_ID --limit=1 --format="value(windowStartTime)")
echo "📅 Last backup: $LAST_BACKUP"

# Check product count
echo "📦 Checking product count..."
# This would require a connection to the database
# PRODUCT_COUNT=$(psql -h $DB_HOST -U $DB_USER -d $DATABASE_NAME -t -c "SELECT COUNT(*) FROM products;")
# echo "🔢 Total products: $PRODUCT_COUNT"

# Check recent changes
echo "📝 Checking recent changes..."
# RECENT_CHANGES=$(psql -h $DB_HOST -U $DB_USER -d $DATABASE_NAME -t -c "SELECT COUNT(*) FROM change_logs WHERE created_at >= NOW() - INTERVAL '24 hours';")
# echo "📊 Changes in last 24h: $RECENT_CHANGES"

# Check disk usage
echo "💽 Checking disk usage..."
DISK_USAGE=$(gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID --format="value(settings.dataDiskSizeGb)")
echo "📊 Disk usage: ${DISK_USAGE}GB"

# Performance metrics
echo "⚡ Performance metrics:"
echo "  🔄 CPU usage: Monitoring via Cloud Console"
echo "  🧠 Memory usage: Monitoring via Cloud Console"
echo "  📊 Connection count: Monitoring via Cloud Console"

echo "✅ System monitoring completed"
EOF

chmod +x scripts/monitor-system.sh

# 8. Create restore script
echo "🔄 Creating restore script..."
cat > scripts/restore-database.sh << 'EOF'
#!/bin/bash

# Database restore script for EGDC
# This script restores the database from a backup

PROJECT_ID="egdc-test"
INSTANCE_NAME="egdc-inventory-db"
DATABASE_NAME="egdc_inventory"
BACKUP_BUCKET="gs://egdc-backups"

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file_name>"
    echo "Example: $0 database_backup_20241208_030000.sql"
    exit 1
fi

BACKUP_FILE="$1"

echo "🔄 Restoring database from backup: $BACKUP_FILE"

# Verify backup file exists
if ! gsutil ls $BACKUP_BUCKET/$BACKUP_FILE > /dev/null 2>&1; then
    echo "❌ Backup file not found: $BACKUP_BUCKET/$BACKUP_FILE"
    exit 1
fi

# Confirmation prompt
echo "⚠️  WARNING: This will overwrite the current database!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    exit 1
fi

# Import database
echo "📥 Importing database..."
gcloud sql import sql $INSTANCE_NAME $BACKUP_BUCKET/$BACKUP_FILE \
    --database=$DATABASE_NAME \
    --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully"
else
    echo "❌ Database restore failed"
    exit 1
fi

echo "🔄 Database restore completed"
EOF

chmod +x scripts/restore-database.sh

# 9. Create cleanup script
echo "🧹 Creating cleanup script..."
cat > scripts/cleanup-backups.sh << 'EOF'
#!/bin/bash

# Backup cleanup script for EGDC
# This script removes old backups to manage storage costs

BACKUP_BUCKET="gs://egdc-backups"
RETENTION_DAYS=30

echo "🧹 Cleaning up old backups..."

# Calculate date threshold
THRESHOLD_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)

# List and remove old backups
echo "📋 Listing backups older than $RETENTION_DAYS days..."
gsutil ls -l $BACKUP_BUCKET/ | grep -E "backup_[0-9]{8}_[0-9]{6}" | while read -r line; do
    # Extract filename
    filename=$(echo $line | awk '{print $NF}')
    
    # Extract date from filename
    backup_date=$(echo $filename | grep -o '[0-9]\{8\}' | head -1)
    
    if [ "$backup_date" -lt "$THRESHOLD_DATE" ]; then
        echo "🗑️  Removing old backup: $filename"
        gsutil rm $filename
    fi
done

echo "✅ Backup cleanup completed"
EOF

chmod +x scripts/cleanup-backups.sh

echo "✅ Backup and monitoring setup completed!"
echo ""
echo "📁 Created backup scripts:"
echo "  ✅ scripts/backup-database.sh - Manual backup creation"
echo "  ✅ scripts/monitor-system.sh - System health monitoring"
echo "  ✅ scripts/restore-database.sh - Database restore"
echo "  ✅ scripts/cleanup-backups.sh - Backup cleanup"
echo ""
echo "🔧 Configured features:"
echo "  ✅ Automated daily backups at 3:00 AM"
echo "  ✅ 7-day backup retention"
echo "  ✅ Point-in-time recovery enabled"
echo "  ✅ Backup storage bucket created"
echo "  ✅ Service account configured"
echo ""
echo "📅 Next steps:"
echo "  1. Set up cron jobs for regular monitoring"
echo "  2. Configure alerting for backup failures"
echo "  3. Test restore procedures"
echo "  4. Set up log monitoring"
echo ""
echo "📊 Monitor backups with: gcloud sql backups list --instance=$INSTANCE_NAME"