import * as fs from 'fs'
import * as path from 'path'

const instructions = `
=== EGDC Production Database Setup Instructions ===

1. CREATE NEW GCP DATABASE:
   - Go to Google Cloud Console → SQL
   - Create new PostgreSQL instance: egdc-production-db
   - Create database: egdc_production
   - Create user: egdc_user (with password)

2. GET CONNECTION STRING:
   Your production DATABASE_URL should look like:
   postgresql://egdc_user:PASSWORD@GCP_HOST:5432/egdc_production

3. ADD TO .env.local:
   Add this line to your .env.local file:
   PRODUCTION_DATABASE_URL=postgresql://egdc_user:PASSWORD@GCP_HOST:5432/egdc_production

4. UPDATE VERCEL ENVIRONMENT VARIABLES:
   In Vercel Dashboard → Environment Variables:
   
   Production Environment:
   DATABASE_URL = postgresql://egdc_user:PASSWORD@GCP_HOST:5432/egdc_production
   
   Preview Environment:
   DATABASE_URL = (keep your current database URL for testing)

5. RUN MIGRATION:
   npx tsx scripts/migrate-to-production.ts

6. VERIFY SETUP:
   npx tsx scripts/test-production-connection.ts

=== IMPORTANT NOTES ===
- Your current database will become the Preview/Development database
- The new database will be your Production database
- This ensures data isolation between environments
- Always test in Preview before deploying to Production
`

console.log(instructions)

// Check if .env.local exists and show current config
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  console.log('\n=== CURRENT .env.local ===')
  console.log(envContent.split('\n').map(line => 
    line.startsWith('DATABASE_URL') ? 'DATABASE_URL=***[HIDDEN]***' : line
  ).join('\n'))
}

export default instructions