# ENTERPRISE DOCKER CONFIGURATION
# Multi-stage build for optimized production containers
# Security hardened with non-root user and minimal attack surface

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# Production stage
FROM node:18-alpine AS production

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy necessary configuration files
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# Create necessary directories
RUN mkdir -p /app/logs && chown nextjs:nodejs /app/logs

# Health check script
COPY --chown=nextjs:nodejs <<EOF /app/healthcheck.sh
#!/bin/sh
set -e

# Check if the application is responding
curl -f http://localhost:\${PORT:-3000}/api/health || exit 1

# Check critical services
curl -f http://localhost:\${PORT:-3000}/api/health/database || exit 1
curl -f http://localhost:\${PORT:-3000}/api/health/integrations || exit 1

echo "Health check passed"
EOF

RUN chmod +x /app/healthcheck.sh

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD /app/healthcheck.sh

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]

# Metadata
LABEL maintainer="EGDC Team <dev@egdc.com>"
LABEL version="1.0.0"
LABEL description="EGDC Enterprise Footwear Inventory Management System"
LABEL org.opencontainers.image.source="https://github.com/egdc/inventory-system"
LABEL org.opencontainers.image.vendor="EGDC"
LABEL org.opencontainers.image.licenses="MIT"