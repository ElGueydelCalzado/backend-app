'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoadingScreen from '@/components/LoadingScreen'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect root page to login
    // This prevents the dashboard from loading at login.lospapatos.com
    console.log('🔄 Root page accessed - redirecting to /login')
    router.push('/login')
  }, [router])

  // Show loading while redirecting
  return <LoadingScreen text="Redirecting to login..." />
}