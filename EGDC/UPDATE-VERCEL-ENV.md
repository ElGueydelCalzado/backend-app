# Update Vercel Environment Variables

## 🌐 Update for New Domain

Since your app is now live at `inventario.elgueydelcalzado.com`, update this environment variable in Vercel:

### **In Vercel Dashboard:**
1. **Go to**: https://vercel.com/dashboard
2. **Select your project** → **Settings** → **Environment Variables**
3. **Find**: `NEXT_PUBLIC_APP_URL`
4. **Update to**: `https://inventario.elgueydelcalzado.com`

## 🔐 Security Environment Variables

Also add these new security-related variables:

```bash
# Security Configuration
ENABLE_SECURITY_HEADERS=true
ENABLE_RATE_LIMITING=true
ENABLE_MONITORING=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security Monitoring
LOG_SECURITY_EVENTS=true
```

## 🚀 After Updating

**Redeploy** to apply the changes:
- Go to **Deployments** tab
- Click **"Redeploy"** on latest deployment