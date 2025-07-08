# Production Environment Variables Checklist

## Required Variables ✅

Copy these to your deployment platform (Vercel/Railway/etc.):

### Database
- [ ] `DATABASE_URL` - Your Google Cloud SQL connection string
- [ ] `NODE_ENV=production`

### Security (Use generated keys above)
- [ ] `API_SECRET_KEY` - Generated secure key
- [ ] `JWT_SECRET` - Generated secure key  
- [ ] `ENCRYPTION_KEY` - Generated secure key

### Application
- [ ] `NEXT_PUBLIC_APP_URL` - Your app's production URL

### Optional Monitoring
- [ ] `SENTRY_DSN` - Error tracking (optional)
- [ ] `DATADOG_API_KEY` - Performance monitoring (optional)

### Feature Flags
- [ ] `ENABLE_RATE_LIMITING=true`
- [ ] `ENABLE_AUDIT_LOGGING=true`
- [ ] `ENABLE_SECURITY_HEADERS=true`

## Deployment Platforms

### Vercel
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable above

### Railway
1. Go to: https://railway.app/dashboard
2. Select your project
3. Go to Variables tab
4. Add each variable above

### Google Cloud Run
1. Use: `gcloud run deploy --set-env-vars`
2. Or set in Cloud Console

## Security Notes
- ✅ Never commit .env files to git
- ✅ Use different keys for development and production
- ✅ Rotate keys regularly
- ✅ Monitor for unauthorized access
