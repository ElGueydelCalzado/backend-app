#!/bin/bash

# Start n8n with Docker Compose
# This script sets up n8n workflow automation for EGDC inventory management

echo "🚀 Starting n8n workflow automation for EGDC..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install Docker Compose."
    exit 1
fi

# Navigate to project directory
cd "$(dirname "$0")/.."

# Stop any existing n8n containers
echo "🛑 Stopping existing n8n containers..."
docker-compose -f docker-compose-n8n.yml down

# Pull latest images
echo "📥 Pulling latest Docker images..."
docker-compose -f docker-compose-n8n.yml pull

# Start n8n services
echo "🔄 Starting n8n services..."
docker-compose -f docker-compose-n8n.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for n8n to be ready..."
sleep 10

# Check if n8n is running
if curl -s -f http://localhost:5678 > /dev/null; then
    echo "✅ n8n is running successfully!"
    echo ""
    echo "🌐 Access n8n at: http://localhost:5678"
    echo "👤 Username: admin"
    echo "🔒 Password: EgdcN8n2024!"
    echo ""
    echo "📊 Services status:"
    docker-compose -f docker-compose-n8n.yml ps
    echo ""
    echo "📝 To view logs: docker-compose -f docker-compose-n8n.yml logs -f"
    echo "🛑 To stop: docker-compose -f docker-compose-n8n.yml down"
else
    echo "❌ n8n failed to start. Checking logs..."
    docker-compose -f docker-compose-n8n.yml logs
fi