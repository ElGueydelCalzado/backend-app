#!/usr/bin/env tsx

/**
 * Debug OAuth Configuration
 * This script helps identify OAuth authentication issues
 */

console.log('🔍 OAuth Configuration Debug\n')

// Check environment variables
console.log('Environment Variables:')
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ MISSING')
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ SET' : '❌ MISSING')
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ SET' : '❌ MISSING')
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ SET' : '❌ MISSING')

console.log('\n📧 Authorized Emails:')
const AUTHORIZED_EMAILS = [
  'elweydelcalzado@gmail.com',
  'manager@elgueydelcalzado.com',
  'employee@elgueydelcalzado.com',
]

AUTHORIZED_EMAILS.forEach((email, index) => {
  console.log(`${index + 1}. ${email}`)
})

console.log('\n🔗 Required Google OAuth Redirect URIs:')
console.log('Production: https://inv.elgueydelcalzado.com/api/auth/callback/google')
console.log('Preview: https://pre.elgueydelcalzado.com/api/auth/callback/google')

console.log('\n🚨 Common Issues:')
console.log('1. Email not in authorized list')
console.log('2. Redirect URI not configured in Google Cloud Console')
console.log('3. NEXTAUTH_URL not matching actual domain')
console.log('4. Missing NEXTAUTH_SECRET')

console.log('\n✅ Solutions:')
console.log('1. Make sure you\'re signing in with: elweydelcalzado@gmail.com')
console.log('2. Add redirect URI to Google Cloud Console OAuth settings')
console.log('3. Verify NEXTAUTH_URL = https://inv.elgueydelcalzado.com')
console.log('4. Generate NEXTAUTH_SECRET with: openssl rand -base64 32')