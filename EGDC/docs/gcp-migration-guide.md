# Migration Guide: Supabase → Google Cloud SQL + Self-hosted n8n

## Prerequisites

- Google Cloud Project with billing enabled
- gcloud CLI installed and configured
- Docker installed for n8n setup
- Access to current Supabase project

## Phase 1: Google Cloud SQL Setup

### 1.1 Create Cloud SQL Instance

```bash
# Set your project variables
export PROJECT_ID="your-project-id"
export REGION="us-central1"  # Choose your preferred region
export INSTANCE_NAME="egdc-inventory-db"
export DB_NAME="egdc_inventory"
export DB_USER="egdc_user"

# Create Cloud SQL PostgreSQL instance
gcloud sql instances create $INSTANCE_NAME \
    --database-version=POSTGRES_15 \
    --tier=db-g1-small \
    --region=$REGION \
    --storage-type=SSD \
    --storage-size=20GB \
    --storage-auto-increase \
    --backup-start-time=03:00 \
    --enable-bin-log \
    --deletion-protection

# Create database
gcloud sql databases create $DB_NAME --instance=$INSTANCE_NAME

# Create user with password
gcloud sql users create $DB_USER --instance=$INSTANCE_NAME --password=your-secure-password

# Get connection details
gcloud sql instances describe $INSTANCE_NAME
```

### 1.2 Configure Network Access

```bash
# Add your IP for initial setup (replace with your IP)
gcloud sql instances patch $INSTANCE_NAME --authorized-networks=YOUR_IP_ADDRESS/32

# For production, configure private IP or VPC peering
gcloud sql instances patch $INSTANCE_NAME --network=default --no-assign-ip
```

### 1.3 Connection Information

Your Cloud SQL connection details:
- **Host**: `your-project-id:region:instance-name` (for Cloud SQL Proxy)
- **Direct IP**: Get from `gcloud sql instances describe egdc-inventory-db`
- **Port**: `5432`
- **Database**: `egdc_inventory`
- **User**: `egdc_user`

## Phase 2: Database Migration

### 2.1 Export from Supabase

```bash
# Install pg_dump if not available
# Export schema and data
pg_dump "postgresql://postgres:[password]@[host]:5432/postgres" \
    --schema-only \
    --file=supabase_schema.sql

pg_dump "postgresql://postgres:[password]@[host]:5432/postgres" \
    --data-only \
    --file=supabase_data.sql
```

### 2.2 Import to Cloud SQL

```bash
# Connect using Cloud SQL Proxy
cloud_sql_proxy -instances=your-project-id:region:instance-name=tcp:5432 &

# Import schema
psql -h localhost -p 5432 -U egdc_user -d egdc_inventory -f supabase_schema.sql

# Import data
psql -h localhost -p 5432 -U egdc_user -d egdc_inventory -f supabase_data.sql
```

## Phase 3: n8n Self-hosted Setup

### 3.1 Docker Compose Configuration

Create `docker-compose.yml` for n8n:

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your-secure-password
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://localhost:5678/
      - GENERIC_TIMEZONE=America/New_York
    volumes:
      - n8n_data:/home/node/.n8n
      - /var/run/docker.sock:/var/run/docker.sock

volumes:
  n8n_data:
```

### 3.2 Start n8n

```bash
# Start n8n
docker-compose up -d

# Check logs
docker-compose logs -f n8n

# Access n8n at http://localhost:5678
```

## Phase 4: Code Migration

### 4.1 Update Dependencies

Replace Supabase dependencies with PostgreSQL:

```bash
# Remove Supabase packages
npm uninstall @supabase/supabase-js @supabase/auth-helpers-nextjs

# Install PostgreSQL packages
npm install pg @types/pg dotenv
```

### 4.2 Environment Variables

Update `.env.local`:

```bash
# Remove Supabase variables
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
# SUPABASE_SERVICE_ROLE_KEY=

# Add Google Cloud SQL variables
DATABASE_URL=postgresql://egdc_user:password@host:5432/egdc_inventory
# For Cloud SQL Proxy
DATABASE_URL=postgresql://egdc_user:password@localhost:5432/egdc_inventory

# Google Cloud Project
GOOGLE_CLOUD_PROJECT_ID=your-project-id
CLOUD_SQL_INSTANCE_NAME=egdc-inventory-db

# n8n Configuration
N8N_WEBHOOK_URL=http://localhost:5678/webhook
N8N_API_KEY=your-n8n-api-key
```

### 4.3 Database Client Updates

Key files to update:
- `lib/supabase.ts` → `lib/database.ts`
- `lib/database.ts` → Update to use pg client
- All API routes in `app/api/`

## Phase 5: Testing & Validation

### 5.1 Test Database Connection

```bash
# Test connection
npx tsx scripts/test-connection.ts

# Verify schema
npx tsx scripts/check-schema.ts
```

### 5.2 Integration Testing

1. Test all CRUD operations
2. Verify calculated columns work
3. Test triggers and functions
4. Validate n8n workflows

## Security Considerations

### Database Security
- Use Cloud SQL IAM authentication
- Configure firewall rules
- Enable SSL connections
- Regular backups and point-in-time recovery

### n8n Security
- Use strong authentication
- Configure HTTPS in production
- Secure webhook endpoints
- Regular updates and backups

## Production Deployment

### Cloud SQL Production Settings
- Use appropriate machine type (db-standard-2 or higher)
- Configure high availability
- Set up automated backups
- Monitor performance

### n8n Production Setup
- Use reverse proxy (nginx/traefik)
- Configure SSL certificates
- Set up monitoring and logging
- Use external database for n8n data

## Rollback Plan

In case of issues:
1. Keep Supabase instance active during migration
2. Maintain database exports
3. Have environment variable rollback ready
4. Test rollback procedure beforehand 