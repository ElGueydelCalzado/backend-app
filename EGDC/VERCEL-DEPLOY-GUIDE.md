# Deploy EGDC to Vercel - Step by Step Guide

## Your App is Ready! 🎉

✅ **Build successful** - Your EGDC app compiles correctly  
✅ **Environment variables generated** - Secure keys created  
✅ **Production ready** - All systems configured  

## Quick Deployment Steps

### Step 1: Login to Vercel
```bash
vercel login
```
Choose **"Continue with GitHub"** and authorize with your GitHub account.

### Step 2: Deploy from GitHub (Recommended)
This is the easiest method:

1. **Go to**: https://vercel.com/new
2. **Import Project**: Select your GitHub repository `ElGueydelCalzado/backend-app`
3. **Configure Project**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `EGDC` (if prompted)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (auto-detected)
4. **Click "Deploy"**

### Step 3: Configure Environment Variables

After deployment, add these environment variables in Vercel:

1. **Go to**: Your project dashboard → Settings → Environment Variables
2. **Add these variables**:

```bash
# Database (Required)
DATABASE_URL=postgresql://egdc_user:EgdcSecure2024!@34.45.148.180:5432/egdc_inventory?sslmode=require

# Application (Required)
NODE_ENV=production

# Security Keys (Use the generated ones from setup script)
API_SECRET_KEY=bd4d2b22bab1c925b299a087786514f803d6d8bf59ec13b0785b190dd73e264e
JWT_SECRET=86eaa274944296ae319c71483e2a9b9bf1ceb1b1919810a7a63de239cbb221d5
ENCRYPTION_KEY=47e223f71160e22fa427923c6653a32f

# Features (Optional)
ENABLE_RATE_LIMITING=true
ENABLE_AUDIT_LOGGING=true
ENABLE_SECURITY_HEADERS=true
```

### Step 4: Redeploy
After adding environment variables, trigger a new deployment:
- Go to **Deployments** tab
- Click **"Redeploy"** on the latest deployment

## Alternative: Manual CLI Deployment

If you prefer command line:

```bash
# 1. Login to Vercel
vercel login

# 2. Deploy (will ask for configuration)
vercel --prod

# 3. Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name: egdc-inventory (or your preferred name)
# - Directory: ./ (current directory)
```

## Your App URLs

After deployment, you'll get:
- **Production URL**: `https://your-project-name.vercel.app`
- **Preview URLs**: For each deployment

## What You'll Have Live

Your production EGDC app will include:
- ✅ **Complete inventory management** across 7 locations
- ✅ **Automated pricing** for SHEIN, Shopify, MercadoLibre
- ✅ **Real-time inventory tracking**
- ✅ **Google Cloud SQL database** (already configured)
- ✅ **Production security** (rate limiting, SSL, validation)
- ✅ **Audit logging** for all changes
- ✅ **Responsive UI** for desktop/mobile

## Testing Your Live App

Once deployed, test these key features:
1. **Homepage**: Should load with inventory overview
2. **Inventory page**: `/inventario` - Main inventory management
3. **API**: Check if data loads from your Google Cloud SQL database
4. **Add Product**: Test adding new products
5. **Edit Product**: Test inline editing functionality

## Estimated Costs

- **Vercel**: Free tier (great for testing) → $20/month (Pro)
- **Google Cloud SQL**: ~$30-50/month (already running)
- **Total**: $0-20/month initially, $50-70/month for production scale

## Need Help?

If deployment fails:
1. **Check logs** in Vercel dashboard
2. **Verify environment variables** are set correctly
3. **Ensure database** is accessible from Vercel IPs
4. **Review build output** for any errors

## Custom Domain (Optional)

After successful deployment:
1. **Go to**: Project Settings → Domains
2. **Add your domain**: `yourdomain.com`
3. **Update DNS**: Point to Vercel's nameservers
4. **SSL**: Automatic with Vercel

---

## Quick Start Commands

```bash
# If you want to try CLI deployment:
vercel login
vercel --prod

# If you prefer GitHub integration (recommended):
# Just go to https://vercel.com/new and import your repository!
```

🚀 **Your EGDC inventory management system is ready to go live!**