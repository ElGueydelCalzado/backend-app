# n8n Setup Instructions for EGDC

## Prerequisites

1. **Install Docker Desktop**
   - Download from: https://www.docker.com/products/docker-desktop/
   - Install and start Docker Desktop
   - Verify installation: `docker --version`

2. **Ensure EGDC API is running**
   - Start your EGDC application: `npm run dev`
   - Verify API is accessible at: http://localhost:3000/api/inventory

## Installation Steps

### 1. Start n8n Services

```bash
# Using the startup script (recommended)
./scripts/start-n8n.sh

# Or manually with Docker Compose
docker compose -f docker-compose-n8n.yml up -d
```

### 2. Access n8n

- **URL**: http://localhost:5678
- **Username**: admin
- **Password**: EgdcN8n2024!

### 3. Import Workflows

1. Login to n8n web interface
2. Go to "Workflows" section
3. Click "Import from file"
4. Import: `n8n/workflows/egdc-inventory-sync.json`
5. Activate the workflow

## Configuration

### Environment Variables

The system is pre-configured with:
- EGDC API URL: http://host.docker.internal:3000/api
- Database connection to Google Cloud SQL
- Spanish locale and Bogota timezone

### Service Ports

- **n8n**: 5678 (Web UI)
- **PostgreSQL**: 5433 (Database)
- **Redis**: 6379 (Queue)

## Workflow Features

### EGDC Inventory Sync Workflow
- **Triggers**: 3 times daily (9:00, 13:00, 17:00)
- **Functions**:
  - Fetches inventory data from EGDC API
  - Analyzes stock levels
  - Generates alerts for low stock (≤5 units)
  - Identifies out-of-stock items
  - Logs results for monitoring
  - Creates Spanish-language reports

### Workflow Logic
1. **Schedule Trigger** → Runs 3x daily
2. **Get Inventory** → Calls EGDC API
3. **Check Success** → Validates API response
4. **Analyze Stock** → Processes inventory data
5. **Has Alerts** → Checks for low/out-of-stock items
6. **Generate Report** → Creates formatted alerts
7. **Log Results** → Records execution details

## Monitoring

### View Service Status
```bash
docker compose -f docker-compose-n8n.yml ps
```

### View Logs
```bash
# All services
docker compose -f docker-compose-n8n.yml logs -f

# n8n only
docker compose -f docker-compose-n8n.yml logs -f n8n
```

### Stop Services
```bash
docker compose -f docker-compose-n8n.yml down
```

## Next Steps

1. **Install Docker Desktop** if not already installed
2. **Start your EGDC application** (`npm run dev`)
3. **Run the n8n startup script** (`./scripts/start-n8n.sh`)
4. **Access n8n** at http://localhost:5678
5. **Import and activate** the inventory sync workflow
6. **Test the workflow** manually before relying on scheduled runs

## Security Notes

- n8n uses basic authentication
- Database credentials are secured
- All services run in isolated Docker network
- Workflow credentials stored in n8n database

## Support

- n8n Documentation: https://docs.n8n.io
- Docker Documentation: https://docs.docker.com
- EGDC API Reference: Check your main application endpoints