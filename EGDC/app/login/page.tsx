'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Mail, Lock, Eye, EyeOff, 
  Chrome, ArrowLeft,
  CheckCircle2, AlertCircle, Loader2
} from 'lucide-react'

type AuthMethod = 'credentials' | 'google'
type UserType = 'retailer' | 'supplier' | null

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Form state
  const [authMethod, setAuthMethod] = useState<AuthMethod>('google')
  const [userType, setUserType] = useState<UserType>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    // Get redirect URL from query params (callbackUrl is set by middleware)
    const callbackUrl = searchParams.get('callbackUrl') || searchParams.get('redirect')
    const userTypeParam = searchParams.get('type') as UserType
    
    if (userTypeParam) {
      setUserType(userTypeParam)
    }
    
    if (callbackUrl) {
      console.log('🔍 Login page loaded with callbackUrl:', callbackUrl)
    }
    
    // Clear any existing error
    setError('')
  }, [searchParams])

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username || !password) {
      setError('Username and password are required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('test-account', {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else if (result?.ok) {
        setSuccess('Login successful!')
        // Get the callback URL from search params or use session to determine redirect
        const callbackUrl = searchParams.get('callbackUrl') || searchParams.get('redirect')
        
        if (callbackUrl) {
          console.log('🎯 Redirecting to callbackUrl:', callbackUrl)
          window.location.href = callbackUrl
        } else {
          // Fallback: Get session to determine redirect - path-based architecture
          const session = await getSession()
          if (session?.user?.tenant_subdomain) {
            // Use centralized tenant utilities
            const { cleanTenantSubdomain, getBaseUrl } = await import('@/lib/tenant-utils')
            const tenantPath = cleanTenantSubdomain(session.user.tenant_subdomain)
            const baseUrl = getBaseUrl()
            const redirectUrl = `${baseUrl}/${tenantPath}/dashboard`
            console.log('🎯 Redirecting to tenant dashboard:', redirectUrl)
            window.location.href = redirectUrl
          } else {
            router.push('/dashboard')
          }
        }
      }
    } catch (error) {
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Get callbackUrl from search params (set by middleware)
      const callbackUrl = searchParams.get('callbackUrl') || searchParams.get('redirect') || '/dashboard'
      
      console.log('🚀 Google login initiated with callbackUrl:', callbackUrl)
      
      await signIn('google', {
        callbackUrl: callbackUrl
      })
    } catch (error) {
      setError('Google login failed. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-xl p-8">
        {/* Brand section hidden as requested */}
        <div className="hidden">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">EG</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-gray-300 mt-1">
            Sign in to your business workspace
          </p>
        </div>
        
        {/* Accessible heading for screen readers */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white sr-only">Login to Your Account</h1>
        </div>


        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded-lg flex items-center" role="alert" aria-live="polite">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
            <span className="text-red-200 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-600 rounded-lg flex items-center" role="alert" aria-live="polite">
            <CheckCircle2 className="w-5 h-5 text-green-400 mr-3" />
            <span className="text-green-200 text-sm">{success}</span>
          </div>
        )}

        {/* Authentication Method Tabs - Google first as requested */}
        <div className="flex border-b border-gray-600 mb-6">
          {[
            { id: 'google', label: 'Google', icon: Chrome },
            { id: 'credentials', label: 'Test Login', icon: Lock }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setAuthMethod(id as AuthMethod)
                setError('')
                setSuccess('')
              }}
              className={`flex-1 py-2 px-3 flex items-center justify-center space-x-2 border-b-2 text-sm font-medium transition-colors ${
                authMethod === id
                  ? 'border-blue-400 text-blue-400'
                  : 'border-transparent text-white hover:text-blue-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Test Credentials Form */}
        {authMethod === 'credentials' && (
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Username
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                  placeholder="test"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                  placeholder="password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="text-sm text-white bg-gray-700/50 p-3 rounded-lg border border-gray-600">
              <p><strong>Demo credentials:</strong></p>
              <p>Username: test</p>
              <p>Password: password</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        )}

        {/* Google OAuth Button */}
        {authMethod === 'google' && (
          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-3 py-3 px-4 border border-gray-600 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Chrome className="w-5 h-5 text-gray-300" />
              <span className="font-medium text-white">Continue with Google</span>
            </button>
            
            <div className="text-sm text-white bg-gray-700/50 p-3 rounded-lg border border-gray-600">
              <p>Production Google OAuth for business owners</p>
            </div>
          </div>
        )}

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <p className="text-sm text-white">
            Don't have an account?{' '}
            <a 
              href="/signup" 
              className="text-blue-400 hover:text-blue-300 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
            >
              Sign up here
            </a>
          </p>
          
          <div className="flex justify-center space-x-6 mt-4 text-sm">
            <a href="/forgot-password" className="text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded">
              Forgot password?
            </a>
            <a href="/help" className="text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded">
              Need help?
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EnhancedLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
        <p className="text-white">Loading...</p>
      </div>
    </div>}>
      <LoginPageContent />
    </Suspense>
  )
}