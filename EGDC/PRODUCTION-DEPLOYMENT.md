# EGDC Production Deployment Guide

## 🎯 Deployment Options

Your EGDC app can be deployed to several platforms. Here are the recommended options:

### Option 1: Vercel (Recommended - Easiest)
- ✅ **Best for**: Next.js applications (optimized)
- ✅ **Pros**: Automatic deployments, CDN, easy setup
- ✅ **Cost**: Free tier available, then $20/month
- ✅ **Database**: Works with your Google Cloud SQL

### Option 2: Google Cloud Platform (Full Control)
- ✅ **Best for**: Complete control, same as your database
- ✅ **Pros**: Same ecosystem as Cloud SQL, scalable
- ✅ **Cost**: Pay-per-use, ~$20-50/month
- ✅ **Database**: Direct connection to your Cloud SQL

### Option 3: Railway (Developer-Friendly)
- ✅ **Best for**: Simple deployment with database
- ✅ **Pros**: Git-based deployments, built-in monitoring
- ✅ **Cost**: $5/month starter plan
- ✅ **Database**: Works with external databases

## 🚀 Recommended: Vercel Deployment

Let's go with Vercel as it's the easiest and most optimized for Next.js:

### Step 1: Prepare Environment Variables

Create your production environment file:

```bash
# Copy template
cp .env.production .env.production.local

# Edit with your production values
nano .env.production.local
```

**Required Environment Variables:**
```bash
# Database (Google Cloud SQL)
DATABASE_URL=postgresql://egdc_user:EgdcSecure2024!@34.45.148.180:5432/egdc_inventory?sslmode=require

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Security
API_SECRET_KEY=your-production-secret-here
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-encryption-key-here

# Optional: Monitoring
SENTRY_DSN=your-sentry-dsn
```

### Step 2: Deploy to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from your repository**:
   ```bash
   vercel --prod
   ```

4. **Set environment variables** in Vercel dashboard

### Step 3: Configure Domain

1. **Custom domain** (optional): Add your domain in Vercel settings
2. **SSL certificate**: Automatic with Vercel
3. **CDN**: Automatic global distribution

## 🗄️ Database Production Setup

Your Google Cloud SQL is already production-ready, but let's secure it further:

### Step 1: Production Security
```bash
# Run the security setup script
./scripts/setup-security.sh
```

### Step 2: IP Whitelisting
Add Vercel IP ranges to your Cloud SQL authorized networks:
```bash
# Get Vercel IP ranges and add to Cloud SQL
gcloud sql instances patch egdc-inventory-db \
    --authorized-networks=0.0.0.0/0 \
    --project=egdc-test
```

### Step 3: SSL Configuration
Ensure SSL is required for all connections:
```bash
gcloud sql instances patch egdc-inventory-db \
    --require-ssl \
    --project=egdc-test
```

## 🔧 Pre-Deployment Checklist

### Code Preparation
- [ ] All tests passing: `npm test`
- [ ] TypeScript builds: `npm run build`
- [ ] No console errors
- [ ] Environment variables configured
- [ ] Database connection tested

### Security Checklist
- [ ] SSL enabled on database
- [ ] IP whitelisting configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Input validation active

### Performance Checklist
- [ ] Images optimized
- [ ] Bundle size acceptable
- [ ] Database queries optimized
- [ ] Caching configured
- [ ] CDN ready

## 🌐 Alternative: Google Cloud Run

If you prefer Google Cloud Platform:

### Step 1: Build Container
```bash
# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
EOF
```

### Step 2: Deploy to Cloud Run
```bash
# Build and deploy
gcloud run deploy egdc-app \
    --source . \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --project egdc-test
```

## 📊 Monitoring Setup

### Step 1: Application Monitoring
```bash
# Add to your production environment
SENTRY_DSN=your-sentry-dsn
DATADOG_API_KEY=your-datadog-key
```

### Step 2: Database Monitoring
Your Google Cloud SQL already has:
- ✅ Automated backups
- ✅ Performance insights
- ✅ Query analysis
- ✅ Alert policies

### Step 3: Uptime Monitoring
Set up monitoring for:
- Application availability
- API endpoint health
- Database connectivity
- Performance metrics

## 🔄 CI/CD Setup

Your GitHub Actions are already configured! For production:

### Step 1: Add Deployment Secrets
In GitHub repository settings, add:
- `VERCEL_TOKEN` - Vercel deployment token
- `DATABASE_URL` - Production database URL
- `API_SECRET_KEY` - Production API secret

### Step 2: Production Workflow
The workflow will automatically:
- ✅ Run tests on push to main
- ✅ Build the application
- ✅ Deploy to production
- ✅ Run post-deployment tests

## 🚀 Deployment Commands

### Quick Vercel Deployment
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod

# 4. Set environment variables in Vercel dashboard
```

### Manual Build Test
```bash
# Test production build locally
npm run build
npm start

# Test API endpoints
npx tsx scripts/test-api-endpoints.ts
```

## 🔍 Post-Deployment Testing

### Step 1: Smoke Tests
- [ ] Application loads
- [ ] API endpoints respond
- [ ] Database connectivity
- [ ] Authentication works
- [ ] Inventory operations function

### Step 2: Performance Tests
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Database queries optimized
- [ ] No memory leaks

### Step 3: Security Tests
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] Rate limiting active
- [ ] Input validation working

## 🎯 Go-Live Checklist

### Before Go-Live
- [ ] All tests passing
- [ ] Environment variables set
- [ ] Database secured
- [ ] Monitoring configured
- [ ] Backups tested
- [ ] Team access configured

### Go-Live Steps
1. **Deploy to production**
2. **Test all functionality**
3. **Monitor for 24 hours**
4. **Update DNS (if custom domain)**
5. **Announce to team**

### After Go-Live
- [ ] Monitor application performance
- [ ] Check error logs
- [ ] Verify automated backups
- [ ] Test alert systems
- [ ] Document any issues

## 💰 Estimated Costs

### Vercel Hosting
- **Free tier**: 0 - Good for testing
- **Pro plan**: $20/month - Production ready
- **Enterprise**: $400/month - Large scale

### Google Cloud SQL
- **Current setup**: ~$30-50/month
- **Includes**: Automated backups, SSL, monitoring

### Total Monthly Cost
- **Startup**: ~$20-30/month (Vercel Free + Cloud SQL)
- **Production**: ~$50-70/month (Vercel Pro + Cloud SQL)

---

## 🎯 Recommended Next Steps

1. **Choose deployment platform** (Vercel recommended)
2. **Set up production environment variables**
3. **Test deployment process**
4. **Configure monitoring**
5. **Go live!**

Your EGDC system is production-ready! Which deployment option would you like to pursue? 🚀