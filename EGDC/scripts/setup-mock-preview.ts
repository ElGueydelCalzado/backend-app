const instructions = `
=== EGDC Mock Preview Database Setup ===

CURRENT SETUP:
✅ Production (inv.lospapatos.com) - Uses current database with real data
🎭 Preview (pre.lospapatos.com) - Will use mock database for testing

STEPS TO SET UP:

1. CREATE MOCK DATABASE IN GCP:
   - Go to Google Cloud Console → SQL
   - Create new PostgreSQL instance: egdc-mock-db
   - Create database: egdc_mock
   - Create user: egdc_user (same password)
   - Get the IP address

2. ADD TO .env.local:
   Add this line:
   MOCK_DATABASE_URL=postgresql://egdc_user:egdc1!@[MOCK_IP]:5432/egdc_mock

3. RUN MOCK DATABASE SETUP:
   npx tsx scripts/create-mock-database.ts

4. UPDATE VERCEL ENVIRONMENT VARIABLES:
   In Vercel → Environment Variables:
   
   Production Environment:
   DATABASE_URL = (keep current - real data)
   
   Preview Environment:
   DATABASE_URL = postgresql://egdc_user:egdc1!@[MOCK_IP]:5432/egdc_mock

BENEFITS:
✅ Production uses real data - no risk of data loss
✅ Preview uses mock data - safe for testing
✅ You can test deletions, updates, imports safely
✅ No accidental changes to production data
✅ Mock data is predictable and consistent for testing

MOCK DATA INCLUDES:
- 5 sample products (Nike, Adidas, Timberland, Birkenstock, Puma)
- Different categories, brands, models
- Realistic inventory numbers across locations
- Sample change logs for testing
- All platform flags for testing filters

This is much safer than sharing databases between environments!
`

console.log(instructions)

export default instructions