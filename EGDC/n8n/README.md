# n8n Workflow Automation for EGDC

This directory contains the n8n workflow automation setup for the EGDC inventory management system.

## Quick Start

```bash
# Start n8n services
./scripts/start-n8n.sh

# Or manually with Docker Compose
docker-compose -f docker-compose-n8n.yml up -d
```

## Access n8n

- **URL**: http://localhost:5678
- **Username**: admin
- **Password**: EgdcN8n2024!

## Services

### n8n (Port 5678)
- Main workflow automation platform
- Web UI for creating and managing workflows
- Connected to PostgreSQL database for persistence
- Configured for Spanish locale and Bogota timezone

### PostgreSQL (Port 5433)
- Database for n8n workflow storage
- Stores workflow definitions, executions, and credentials
- User: `n8n_user`
- Password: `N8nSecure2024!`

### Redis (Port 6379)
- Queue management for high-performance workflow execution
- Password: `RedisSecure2024!`

## Pre-configured Workflows

### 1. EGDC Inventory Sync
- **File**: `workflows/egdc-inventory-sync.json`
- **Description**: Automated inventory monitoring
- **Schedule**: 3 times daily (9:00, 13:00, 17:00)
- **Features**:
  - Fetches inventory data from EGDC API
  - Analyzes stock levels
  - Generates alerts for low/out-of-stock items
  - Logs results for monitoring

## Available Workflow Templates

### Inventory Management
- **Low Stock Alerts**: Monitor and alert when products are running low
- **Out of Stock Notifications**: Immediate alerts for zero stock items
- **Inventory Reports**: Daily/weekly inventory summaries
- **Price Monitoring**: Track price changes across platforms

### Data Integration
- **Database Sync**: Sync inventory data with external systems
- **API Integration**: Connect with e-commerce platforms
- **Export Automation**: Automatic data exports to Google Sheets/Excel
- **Backup Creation**: Automated database backups

### Business Intelligence
- **Sales Analytics**: Track sales performance across platforms
- **Inventory Turnover**: Calculate inventory turnover rates
- **Profit Margin Analysis**: Monitor profit margins by product/category
- **Platform Performance**: Compare performance across sales channels

## Environment Variables

The following environment variables are pre-configured:

```bash
# EGDC API Connection
EGDC_API_URL=http://host.docker.internal:3000/api
EGDC_DATABASE_URL=postgresql://egdc_user:egdc1!@34.45.148.180:5432/egdc_inventory

# n8n Configuration
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=EgdcN8n2024!
N8N_ENCRYPTION_KEY=EgdcN8nEncryptionKey2024Secret
GENERIC_TIMEZONE=America/Bogota
N8N_DEFAULT_LOCALE=es
```

## Creating New Workflows

1. **Access n8n**: Open http://localhost:5678
2. **Login**: Use admin/EgdcN8n2024!
3. **Create Workflow**: Click "+" to create new workflow
4. **Add Nodes**: Drag and drop nodes from the sidebar
5. **Configure**: Set up connections and parameters
6. **Test**: Use the test button to validate workflow
7. **Activate**: Enable the workflow to run automatically

## Common Node Types for EGDC

### Triggers
- **Cron**: Schedule workflows (daily, hourly, etc.)
- **Webhook**: Trigger from external systems
- **HTTP Request**: Monitor API endpoints

### Data Processing
- **Function**: Custom JavaScript code
- **Set**: Transform data structure
- **IF**: Conditional logic
- **Switch**: Multiple condition routing

### External Integrations
- **HTTP Request**: Call EGDC API endpoints
- **PostgreSQL**: Direct database operations
- **Email**: Send notifications
- **Google Sheets**: Export data

## Monitoring and Logs

```bash
# View all service logs
docker-compose -f docker-compose-n8n.yml logs -f

# View n8n logs only
docker-compose -f docker-compose-n8n.yml logs -f n8n

# View database logs
docker-compose -f docker-compose-n8n.yml logs -f n8n-postgres
```

## Maintenance

### Start Services
```bash
docker-compose -f docker-compose-n8n.yml up -d
```

### Stop Services
```bash
docker-compose -f docker-compose-n8n.yml down
```

### Restart Services
```bash
docker-compose -f docker-compose-n8n.yml restart
```

### Update Images
```bash
docker-compose -f docker-compose-n8n.yml pull
docker-compose -f docker-compose-n8n.yml up -d
```

### Backup Data
```bash
# Backup n8n workflows and data
docker exec egdc-n8n-postgres pg_dump -U n8n_user n8n > n8n_backup.sql

# Backup workflows directory
cp -r n8n/workflows n8n_workflows_backup
```

## Security Notes

- n8n is configured with basic authentication
- Database uses strong passwords
- Redis requires authentication
- All services run in isolated Docker network
- Credentials are stored securely in n8n

## Troubleshooting

### n8n Not Starting
```bash
# Check Docker status
docker ps

# Check service logs
docker-compose -f docker-compose-n8n.yml logs

# Restart services
docker-compose -f docker-compose-n8n.yml restart
```

### Database Connection Issues
```bash
# Check PostgreSQL logs
docker-compose -f docker-compose-n8n.yml logs n8n-postgres

# Test database connection
docker exec egdc-n8n-postgres psql -U n8n_user -d n8n -c "SELECT version();"
```

### Workflow Execution Errors
1. Check workflow logs in n8n UI
2. Verify API endpoints are accessible
3. Check database connectivity
4. Validate node configurations

## Support

For issues with n8n workflows:
1. Check the n8n documentation: https://docs.n8n.io
2. Review workflow logs in the n8n UI
3. Verify EGDC API endpoints are working
4. Check Docker service status