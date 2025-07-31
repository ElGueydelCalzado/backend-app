'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import LoadingScreen from '@/components/LoadingScreen'
import { isDevModeAllowed, getTestTenantConfig, logDevModeWarning } from '@/lib/dev-utils'
import { cleanTenantSubdomain } from '@/lib/tenant-utils'

export default function DashboardRedirect() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // SECURITY: Consolidated development mode check with proper safeguards
    if (isDevModeAllowed()) {
      const testConfig = getTestTenantConfig()
      if (testConfig) {
        logDevModeWarning()
        console.log('🧪 Development mode active - redirecting to test tenant')
        router.push(`/${testConfig.tenant_subdomain}/dashboard`)
        return
      }
    }

    if (status === 'loading') return // Still loading

    if (!session) {
      // Not authenticated, redirect to login with error context
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('error') === 'redirect_loop') {
        console.error('🚫 Redirect loop detected - clearing session and redirecting to login')
        // Could add session clearing logic here if needed
      }
      router.push('/login')
      return
    }

    if (session.user?.tenant_subdomain) {
      // ANTI-LOOP PROTECTION: Check if we're already on the correct tenant path
      const tenantPath = cleanTenantSubdomain(session.user.tenant_subdomain)
      const tenantUrl = `/${tenantPath}/dashboard`
      
      // Prevent redirect if we're in a potential loop scenario
      if (window.location.pathname === '/dashboard' && window.location.href.includes(tenantPath)) {
        console.warn('⚠️ Potential redirect loop detected - staying on current path')
        return
      }
      
      console.log('🔄 Redirecting from generic dashboard to tenant dashboard:', {
        from: '/dashboard',
        to: tenantUrl,
        tenant: tenantPath,
        originalSubdomain: session.user.tenant_subdomain,
        currentHref: window.location.href
      })
      
      router.push(tenantUrl)
    } else {
      // No tenant info, redirect to login
      router.push('/login')
    }
  }, [session, status, router])

  // Show loading while redirecting
  return <LoadingScreen text="Redirigiendo a tu workspace..." />
}