# Migration Guide: Supabase → Google Cloud SQL + n8n

## 📋 Overview

This guide walks you through migrating your EGDC inventory system from Supabase to Google Cloud SQL (PostgreSQL) and setting up a self-hosted n8n instance.

## 🚀 Quick Start

1. **Prerequisites Setup**
```bash
# Install Google Cloud CLI
curl https://sdk.cloud.google.com | bash
gcloud init

# Install Docker (for n8n)
# Follow: https://docs.docker.com/get-docker/
```

2. **Run Migration Helper**
```bash
npm run migrate-from-supabase
```

3. **Set Up n8n**
```bash
npm run setup-n8n
```

## 📊 Phase 1: Google Cloud SQL Setup

### 1.1 Create Cloud SQL Instance

```bash
# Set your variables
export PROJECT_ID="your-project-id"
export REGION="us-central1"
export INSTANCE_NAME="egdc-inventory-db"
export DB_NAME="egdc_inventory"
export DB_USER="egdc_user"
export DB_PASSWORD="your-secure-password"

# Create the instance
gcloud sql instances create $INSTANCE_NAME \
    --database-version=POSTGRES_15 \
    --tier=db-g1-small \
    --region=$REGION \
    --storage-type=SSD \
    --storage-size=20GB \
    --storage-auto-increase \
    --backup-start-time=03:00

# Create database and user
gcloud sql databases create $DB_NAME --instance=$INSTANCE_NAME
gcloud sql users create $DB_USER --instance=$INSTANCE_NAME --password=$DB_PASSWORD

# Get connection info
gcloud sql instances describe $INSTANCE_NAME
```

### 1.2 Set Up Cloud SQL Proxy (for local development)

```bash
# Download Cloud SQL Proxy
curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64
chmod +x cloud_sql_proxy

# Start proxy
./cloud_sql_proxy -instances=$PROJECT_ID:$REGION:$INSTANCE_NAME=tcp:5432 &
```

## 🔄 Phase 2: Database Migration

### 2.1 Export from Supabase

```bash
# Get your Supabase project details from the dashboard
export SUPABASE_PROJECT_ID="your-project-id"
export SUPABASE_PASSWORD="your-database-password"

# Export schema
pg_dump "postgresql://postgres:$SUPABASE_PASSWORD@db.$SUPABASE_PROJECT_ID.supabase.co:5432/postgres" \
    --schema-only \
    --file=supabase_schema.sql

# Export data
pg_dump "postgresql://postgres:$SUPABASE_PASSWORD@db.$SUPABASE_PROJECT_ID.supabase.co:5432/postgres" \
    --data-only \
    --file=supabase_data.sql
```

### 2.2 Import to Cloud SQL

```bash
# Import schema
psql "postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME" -f supabase_schema.sql

# Import data
psql "postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME" -f supabase_data.sql
```

## 🔧 Phase 3: Code Migration

### 3.1 Update Dependencies

```bash
# Remove Supabase packages
npm uninstall @supabase/supabase-js @supabase/auth-helpers-nextjs

# Install PostgreSQL packages (already done)
npm install pg @types/pg
```

### 3.2 Update Environment Variables

Create/update your `.env.local`:

```bash
# Remove old Supabase variables
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
# SUPABASE_SERVICE_ROLE_KEY=

# Add new PostgreSQL variables
DATABASE_URL=postgresql://egdc_user:your-password@localhost:5432/egdc_inventory

# Google Cloud settings
GOOGLE_CLOUD_PROJECT_ID=your-project-id
CLOUD_SQL_INSTANCE_NAME=egdc-inventory-db
CLOUD_SQL_REGION=us-central1

# Next.js
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3.3 Test Connection

```bash
npm run test-postgres
```

## 🤖 Phase 4: n8n Setup

### 4.1 Start n8n

```bash
# Copy environment template
cp env.template .env

# Edit .env with your settings
# Set N8N_USER, N8N_PASSWORD, N8N_ENCRYPTION_KEY

# Start n8n
npm run setup-n8n

# Check logs
docker-compose logs -f n8n

# Access n8n at http://localhost:5678
```

### 4.2 n8n Configuration

1. **Access n8n**: Open http://localhost:5678
2. **Login**: Use credentials from your `.env` file
3. **Create workflows**: Start building automation workflows
4. **Connect to your database**: Use HTTP nodes to call your API endpoints

### 4.3 Example n8n Workflow

Create a workflow to sync inventory:
- **Trigger**: HTTP Webhook
- **HTTP Request**: GET your inventory API
- **Process Data**: Transform as needed
- **HTTP Request**: POST updates back

## 🧪 Phase 5: Testing

### 5.1 Test Database Connection
```bash
npm run test-postgres
```

### 5.2 Test API Endpoints
```bash
# Test inventory fetch
curl http://localhost:3000/api/inventory

# Test inventory update
curl -X POST http://localhost:3000/api/inventory/update \
  -H "Content-Type: application/json" \
  -d '{"changes":[{"id":1,"categoria":"Test"}]}'
```

### 5.3 Test n8n
1. Create a simple workflow
2. Test webhook endpoints
3. Verify data processing

## 🚀 Phase 6: Production Deployment

### 6.1 Production Cloud SQL
```bash
# Upgrade to production tier
gcloud sql instances patch $INSTANCE_NAME --tier=db-standard-2

# Enable high availability
gcloud sql instances patch $INSTANCE_NAME --availability-type=REGIONAL

# Configure automated backups
gcloud sql instances patch $INSTANCE_NAME --backup-start-time=03:00
```

### 6.2 Production n8n
1. **Use external database for n8n**:
   - Uncomment PostgreSQL service in docker-compose.yml
   - Update n8n environment variables

2. **Set up reverse proxy**:
   - Configure nginx or traefik
   - Set up SSL certificates
   - Use proper domain name

3. **Security**:
   - Change default passwords
   - Configure firewall rules
   - Enable HTTPS

## 🔍 Verification Checklist

- [ ] Google Cloud SQL instance created and accessible
- [ ] Database schema and data migrated successfully
- [ ] Application connects to new PostgreSQL database
- [ ] All API endpoints working with new database
- [ ] n8n instance running and accessible
- [ ] Environment variables updated
- [ ] Dependencies updated (removed Supabase, added pg)
- [ ] Test scripts passing

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Check Cloud SQL Proxy
ps aux | grep cloud_sql_proxy

# Test direct connection
psql "postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME" -c "SELECT 1;"

# Check firewall rules
gcloud sql instances describe $INSTANCE_NAME
```

### n8n Issues
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs n8n

# Restart n8n
docker-compose restart n8n
```

### API Issues
```bash
# Check environment variables
npm run dev

# Test database functions
npm run test-postgres
```

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the logs for specific error messages
3. Verify all environment variables are set correctly
4. Ensure database schema matches your application requirements

## 🎯 Next Steps After Migration

1. **Monitor Performance**: Set up monitoring for both database and n8n
2. **Backup Strategy**: Configure automated backups and test restore procedures
3. **Scaling**: Plan for horizontal scaling if needed
4. **Security**: Review and harden security settings
5. **Documentation**: Update team documentation with new setup

---

**Migration completed successfully!** 🎉

Your EGDC inventory system is now running on Google Cloud SQL with self-hosted n8n for automation. 