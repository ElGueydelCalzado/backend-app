#!/bin/bash

# Monitoring Setup for EGDC
# This script sets up comprehensive monitoring for the EGDC inventory management system

echo "📊 Setting up monitoring for EGDC..."

# Create monitoring directory
mkdir -p monitoring/grafana
mkdir -p monitoring/prometheus
mkdir -p logs

# Create Prometheus configuration
echo "⚙️  Creating Prometheus configuration..."
cat > monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'egdc-app'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: /api/metrics
    scrape_interval: 30s
    
  - job_name: 'egdc-postgres'
    static_configs:
      - targets: ['host.docker.internal:5432']
    scrape_interval: 30s
    
  - job_name: 'egdc-n8n'
    static_configs:
      - targets: ['host.docker.internal:5678']
    scrape_interval: 30s

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
EOF

# Create Prometheus alert rules
echo "🚨 Creating alert rules..."
cat > monitoring/prometheus/alert_rules.yml << 'EOF'
groups:
  - name: egdc_alerts
    rules:
      - alert: DatabaseDown
        expr: up{job="egdc-postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "EGDC Database is down"
          description: "PostgreSQL database has been down for more than 1 minute"

      - alert: ApplicationDown
        expr: up{job="egdc-app"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "EGDC Application is down"
          description: "EGDC application has been down for more than 2 minutes"

      - alert: HighErrorRate
        expr: rate(egdc_api_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 10% for 5 minutes"

      - alert: LowInventory
        expr: egdc_low_stock_items > 10
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "Low inventory alert"
          description: "{{ $value }} items are running low on stock"

      - alert: OutOfStock
        expr: egdc_out_of_stock_items > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Out of stock alert"
          description: "{{ $value }} items are out of stock"
EOF

# Create Grafana dashboard configuration
echo "📈 Creating Grafana dashboard..."
cat > monitoring/grafana/dashboard.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "EGDC Inventory Dashboard",
    "tags": ["egdc", "inventory"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Total Products",
        "type": "stat",
        "targets": [
          {
            "expr": "egdc_total_products",
            "legendFormat": "Products"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Inventory Value",
        "type": "stat",
        "targets": [
          {
            "expr": "egdc_inventory_value",
            "legendFormat": "Value"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "API Requests",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(egdc_api_requests_total[5m])",
            "legendFormat": "Requests/sec"
          }
        ],
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Low Stock Items",
        "type": "stat",
        "targets": [
          {
            "expr": "egdc_low_stock_items",
            "legendFormat": "Low Stock"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 16}
      },
      {
        "id": 5,
        "title": "Out of Stock Items",
        "type": "stat",
        "targets": [
          {
            "expr": "egdc_out_of_stock_items",
            "legendFormat": "Out of Stock"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 16}
      }
    ],
    "time": {
      "from": "now-6h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF

# Create Docker Compose for monitoring stack
echo "🐳 Creating monitoring Docker Compose..."
cat > docker-compose-monitoring.yml << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: egdc-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - egdc-monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: egdc-grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=EgdcGrafana2024!
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning
    networks:
      - egdc-monitoring

  alertmanager:
    image: prom/alertmanager:latest
    container_name: egdc-alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager:/etc/alertmanager
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--web.external-url=http://localhost:9093'
    networks:
      - egdc-monitoring

  node-exporter:
    image: prom/node-exporter:latest
    container_name: egdc-node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - egdc-monitoring

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:

networks:
  egdc-monitoring:
    driver: bridge
EOF

# Create Alertmanager configuration
echo "🔔 Creating Alertmanager configuration..."
mkdir -p monitoring/alertmanager
cat > monitoring/alertmanager/alertmanager.yml << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@egdc.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://host.docker.internal:3000/api/alerts'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
EOF

# Create log monitoring configuration
echo "📝 Creating log monitoring configuration..."
cat > monitoring/filebeat.yml << 'EOF'
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/egdc/*.log
  fields:
    service: egdc
    environment: production

output.logstash:
  hosts: ["localhost:5044"]

processors:
- add_host_metadata:
    when.not.contains.tags: forwarded
EOF

# Create monitoring startup script
echo "🚀 Creating monitoring startup script..."
cat > scripts/start-monitoring.sh << 'EOF'
#!/bin/bash

echo "📊 Starting EGDC monitoring stack..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Start monitoring services
echo "🔄 Starting monitoring services..."
docker compose -f docker-compose-monitoring.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 15

# Check service status
echo "📊 Checking service status..."
docker compose -f docker-compose-monitoring.yml ps

echo "✅ Monitoring stack started successfully!"
echo ""
echo "🌐 Access URLs:"
echo "  📊 Prometheus: http://localhost:9090"
echo "  📈 Grafana: http://localhost:3001 (admin/EgdcGrafana2024!)"
echo "  🔔 Alertmanager: http://localhost:9093"
echo "  📈 Node Exporter: http://localhost:9100"
echo ""
echo "📝 To view logs: docker compose -f docker-compose-monitoring.yml logs -f"
echo "🛑 To stop: docker compose -f docker-compose-monitoring.yml down"
EOF

chmod +x scripts/start-monitoring.sh

echo "✅ Monitoring setup completed!"
echo ""
echo "🛠️  Created monitoring components:"
echo "  ✅ Prometheus configuration"
echo "  ✅ Grafana dashboard"
echo "  ✅ Alertmanager configuration"
echo "  ✅ Docker Compose for monitoring"
echo "  ✅ Startup script"
echo ""
echo "🚀 To start monitoring: ./scripts/start-monitoring.sh"