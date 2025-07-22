# Custom Domain Setup for EGDC

## 🎯 Goal
Set up a professional custom domain for your EGDC inventory system instead of the Vercel subdomain.

## 🌐 Domain Options

### **Recommended Domain Names:**
- `inventory.lospapatos.com`
- `egdc-inventory.com`
- `admin.lospapatos.com`
- `sistema.lospapatos.com`

## 📋 Step-by-Step Setup

### **Step 1: Choose Your Domain**
If you don't have a domain yet:
1. **Buy from**: Namecheap, GoDaddy, or Google Domains
2. **Recommended**: `.com` for professional appearance
3. **Cost**: ~$10-15/year

### **Step 2: Add Domain to Vercel**
1. **Go to**: https://vercel.com/dashboard
2. **Select your project**: `egdc-inventory` (or your project name)
3. **Go to**: Settings → Domains
4. **Add domain**: Enter your chosen domain
5. **Choose type**: 
   - **Primary domain** (redirects www)
   - **Redirect** (if you want subdomain)

### **Step 3: Configure DNS Records**

#### **If using a subdomain (recommended):**
Add these DNS records to your domain provider:

```dns
Type: CNAME
Name: inventory (or your chosen subdomain)
Value: cname.vercel-dns.com
TTL: 300 seconds
```

#### **If using root domain:**
Add these DNS records:

```dns
Type: A
Name: @ (root)
Value: 76.76.19.61
TTL: 300 seconds

Type: CNAME  
Name: www
Value: cname.vercel-dns.com
TTL: 300 seconds
```

### **Step 4: Verify Domain**
1. **Wait**: 5-10 minutes for DNS propagation
2. **Check**: Vercel will show "Valid Configuration" 
3. **Test**: Visit your new domain URL

### **Step 5: Update Environment Variables**
Update your Vercel environment variables:

```bash
NEXT_PUBLIC_APP_URL=https://your-custom-domain.com
```

### **Step 6: Force HTTPS (Automatic)**
Vercel automatically:
- ✅ **Generates SSL certificate**
- ✅ **Forces HTTPS redirect** 
- ✅ **Renews certificates** automatically

## 🔧 Manual DNS Configuration Examples

### **Namecheap DNS Settings:**
```
Host: inventory
Type: CNAME Record  
Value: cname.vercel-dns.com
TTL: Automatic
```

### **GoDaddy DNS Settings:**
```
Type: CNAME
Name: inventory
Value: cname.vercel-dns.com  
TTL: 600 seconds
```

### **Cloudflare DNS Settings:**
```
Type: CNAME
Name: inventory
Target: cname.vercel-dns.com
Proxy Status: DNS only (gray cloud)
```

## ✅ **Verification Checklist**

After setup, verify these work:
- [ ] **Main URL**: `https://your-domain.com` loads your app
- [ ] **HTTPS**: Green lock icon in browser
- [ ] **Redirects**: `http://` redirects to `https://`
- [ ] **WWW**: `www.your-domain.com` works (if configured)
- [ ] **No errors**: All pages load correctly

## 🎯 **Expected Results**

After completing this setup:
- ✅ **Professional URL**: `https://inventory.lospapatos.com`
- ✅ **Automatic SSL**: Secure HTTPS connection
- ✅ **Fast loading**: Global CDN distribution
- ✅ **Professional appearance**: Custom branding

## 🔍 **Troubleshooting**

### **Domain not working:**
- **Wait**: DNS changes take 5-24 hours to propagate
- **Check**: DNS records are exactly as specified
- **Verify**: No typos in CNAME value

### **SSL certificate issues:**
- **Wait**: Certificate generation takes 5-10 minutes
- **Check**: Domain is properly verified in Vercel
- **Contact**: Vercel support if issues persist

### **Redirects not working:**
- **Check**: Both root and www are configured
- **Verify**: DNS records point to correct values
- **Test**: Use different browsers/devices

## 💡 **Pro Tips**

1. **Use subdomain**: `inventory.yourdomain.com` is easier to set up
2. **Keep it simple**: Short, memorable domain names work best
3. **Test thoroughly**: Check all pages work with new domain
4. **Update bookmarks**: Share new URL with your team

---

## 🚀 **Next Step**

Once your domain is working, we'll move to **Security Hardening** to make your system production-ready!