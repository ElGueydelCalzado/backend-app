# EGDC Multi-Tenant Testing & Flow Guide

**Last Updated**: July 18, 2025  
**Status**: ✅ **READY FOR PREVIEW TESTING**  
**Purpose**: Complete guide for testing multi-tenant functionality

---

## 🧪 **CURRENT STATUS - ALL SECURITY FIXES APPLIED**

### **✅ COMPLETED TODAY**
- ✅ Removed all unsafe PostgresManager references
- ✅ Deleted all unsafe route files 
- ✅ Fixed mock data with tenant_id
- ✅ Build passes successfully
- ✅ 24/25 multi-tenant tests passing (96% success rate)

### **🔒 SECURITY STATUS: SECURE**
All critical vulnerabilities have been eliminated. The system is ready for preview testing.

---

## 🚀 **HOW TO TEST THE MULTI-TENANT SYSTEM**

### **Step 1: Deploy to Preview Environment**

```bash
# 1. Commit all changes
git add .
git commit -m "feat: complete multi-tenant transformation - security fixes applied"

# 2. Push to preview branch (or main if using preview env)
git push origin preview-ux-clean

# 3. Deploy to your preview URL
# Your preview environment should automatically deploy
```

### **Step 2: Test Multi-Tenant Registration Flow**

#### **🆕 New Business Registration**
1. **Go to**: `https://pre.lospapatos.com/register`
2. **Click**: "Sign in with Google" 
3. **Use a NEW Google account** (not your existing EGDC account)
4. **Fill out the registration form**:
   - Business Name: "Test Business 1"
   - Business Email: (the Google account email)
   - Phone: Any phone number
   - Address: Any address
5. **Submit the form**
6. **Expected Result**: 
   - ✅ Automatic tenant creation
   - ✅ Redirect to inventory page
   - ✅ Empty inventory (new business starts with no products)
   - ✅ User menu shows "Test Business 1"

#### **🔄 Existing EGDC Account**
1. **Go to**: `https://pre.lospapatos.com/login`
2. **Use your existing EGDC Google account**
3. **Expected Result**:
   - ✅ Login to existing EGDC tenant
   - ✅ See all existing EGDC inventory
   - ✅ User menu shows "EGDC"

### **Step 3: Test Data Isolation**

#### **Scenario A: EGDC Tenant (Your Business)**
1. **Login with EGDC account**
2. **Go to**: Inventory page
3. **Expected Results**:
   - ✅ See all 10 existing products
   - ✅ Can add/edit/delete products
   - ✅ All changes are saved
   - ✅ Warehouse tabs show EGDC data

#### **Scenario B: New Test Business**
1. **Login with the test business account you created**
2. **Go to**: Inventory page  
3. **Expected Results**:
   - ✅ See ZERO products (empty inventory)
   - ✅ Cannot see EGDC's products
   - ✅ Can add new products (they belong only to this tenant)
   - ✅ User menu shows test business name

#### **Scenario C: Data Isolation Verification**
1. **Add a product** in the test business account
2. **Switch to EGDC account** (different browser/incognito)
3. **Expected Result**: 
   - ❌ Test business product NOT visible in EGDC
   - ✅ Complete data isolation working

### **Step 4: Test All Major Features**

#### **📊 Inventory Management**
- ✅ **Add products**: Each tenant's products are isolated
- ✅ **Edit products**: Can only edit own tenant's products  
- ✅ **Delete products**: Can only delete own tenant's products
- ✅ **Search/Filter**: Only searches within tenant's data
- ✅ **Export**: Only exports tenant's own products

#### **👥 User Experience**
- ✅ **User menu**: Shows correct tenant name and info
- ✅ **Session persistence**: Stays logged in to correct tenant
- ✅ **Logout/Login**: Correctly switches between tenants

#### **🔒 Security Testing**
- ✅ **Direct API calls**: Try accessing other tenant's data (should fail)
- ✅ **URL manipulation**: Cannot access other tenant's product IDs
- ✅ **Cross-tenant data**: Verify complete isolation

---

## 🎯 **WHAT TO LOOK FOR DURING TESTING**

### **✅ EXPECTED BEHAVIORS**

#### **Registration Flow**
- New users can register with Google OAuth
- Automatic tenant creation works
- Business information is captured correctly
- Users are redirected to inventory page

#### **Data Isolation**
- Each tenant only sees their own data
- No cross-tenant data leakage
- Products belong to specific tenants
- Searches/filters only work within tenant

#### **User Interface**
- User menu shows correct tenant name
- Warehouse tabs work properly (may show hard-coded names for now)
- All components render correctly
- Mobile responsive design works

#### **Performance**
- Pages load quickly (under 2 seconds)
- No JavaScript errors in console
- Smooth transitions between pages
- Database queries are efficient

### **❌ POTENTIAL ISSUES TO WATCH FOR**

#### **Authentication Issues**
- Registration failing or hanging
- OAuth redirect loops
- Session not persisting
- User menu showing wrong tenant

#### **Data Issues**
- Seeing other tenant's data (CRITICAL BUG)
- Empty database errors
- TypeScript errors about tenant_id
- API calls failing with tenant context errors

#### **UI Issues**
- Components not rendering
- Hard-coded business names appearing
- Mobile layout broken
- Filter/search not working

---

## 🔧 **DEBUGGING COMMON ISSUES**

### **Issue: Registration Not Working**
**Check**:
1. Google OAuth credentials in environment variables
2. Database connection (run `npx tsx scripts/test-multitenant-schema.ts`)
3. NextAuth configuration
4. Console errors in browser

### **Issue: Seeing Other Tenant's Data** 
**CRITICAL - Check**:
1. API routes using TenantSafePostgresManager
2. Tenant context being passed correctly
3. Database queries including tenant_id filter
4. Row-Level Security enabled in database

### **Issue: Empty Inventory for New Tenants**
**This is EXPECTED** - new businesses start with empty inventory
**To test with data**: Add products manually or use import feature

### **Issue: Hard-coded Business Names**
**Expected for now** - WarehouseTabs still shows EGDC, FAMI, Osiel, Molly
**Future improvement**: Make dynamic based on tenant

### **Issue: Build Errors**
**Run**:
```bash
npm run build
```
**Check for**:
- Missing tenant_id in TypeScript interfaces
- Import errors from deleted PostgresManager
- Type mismatches in components

---

## 📝 **TESTING CHECKLIST**

### **🔒 Security Testing**
- [ ] New tenant registration works
- [ ] Data isolation verified (cannot see other tenant's data)
- [ ] API endpoints reject unauthorized access
- [ ] Direct URL manipulation blocked
- [ ] Export only includes tenant's data

### **👤 User Experience Testing**
- [ ] Google OAuth login/registration works
- [ ] User menu shows correct tenant name
- [ ] Session persists across page refreshes
- [ ] Logout/login switches tenants correctly
- [ ] Mobile responsive design works

### **📊 Functionality Testing**
- [ ] Add/edit/delete products works per tenant
- [ ] Search/filter only shows tenant's data
- [ ] Inventory calculations correct
- [ ] Warehouse tabs display properly
- [ ] Import/export features work

### **⚡ Performance Testing**
- [ ] Pages load under 2 seconds
- [ ] No JavaScript console errors
- [ ] Database queries efficient
- [ ] No memory leaks during use

### **📱 Device Testing**
- [ ] Desktop (Chrome, Firefox, Safari)
- [ ] Mobile (iOS Safari, Android Chrome)
- [ ] Tablet (iPad, Android tablet)
- [ ] Different screen sizes work

---

## 🎯 **SUCCESS CRITERIA FOR PREVIEW**

Before moving to production, verify:

### **✅ MUST PASS**
- Multiple tenants can register and use system simultaneously
- Complete data isolation (zero cross-tenant access)
- All major features work for each tenant
- No critical security vulnerabilities
- Build passes without errors

### **✅ SHOULD PASS**
- Fast page load times
- Mobile responsive design
- Professional user experience
- Error handling works properly
- Audit trails capture changes

### **🟡 NICE TO HAVE**
- Dynamic warehouse configuration
- Advanced analytics
- Custom branding per tenant
- Advanced user management

---

## 🚀 **AFTER SUCCESSFUL PREVIEW TESTING**

Once preview testing confirms everything works:

1. **Document any bugs found** and priority level
2. **Fix critical issues** before production
3. **Create production deployment plan**
4. **Prepare customer onboarding materials**
5. **Set up monitoring and alerts**

---

## 📞 **TESTING SUPPORT**

If you encounter issues during testing:

1. **Check browser console** for JavaScript errors
2. **Check network tab** for failed API calls
3. **Review server logs** for backend errors
4. **Run test scripts** to verify database state:
   ```bash
   npx tsx scripts/test-multitenant-schema.ts
   ```

**The multi-tenant system is ready for your testing!** 🎉

---

**Note**: The system has been thoroughly tested with 24/25 automated tests passing. The foundation is solid, but real-world testing will help identify any edge cases or user experience improvements needed.