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
  const [authMethod, setAuthMethod] = useState<AuthMethod>('credentials')
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
            const tenantPath = session.user.tenant_subdomain.replace('preview-', '').replace('mock-', '')
            const redirectUrl = `http://localhost:3000/${tenantPath}/dashboard`
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">EG</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-1">
            Sign in to your business workspace
          </p>
        </div>


        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle2 className="w-5 h-5 text-green-600 mr-3" />
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}

        {/* Authentication Method Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {[
            { id: 'credentials', label: 'Test Login', icon: Lock },
            { id: 'google', label: 'Google', icon: Chrome }
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
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="test"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
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
              className="w-full flex items-center justify-center space-x-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Chrome className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Continue with Google</span>
            </button>
            
            <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
              <p>Production Google OAuth for business owners</p>
            </div>
          </div>
        )}

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <a 
              href="/signup" 
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign up here
            </a>
          </p>
          
          <div className="flex justify-center space-x-6 mt-4 text-sm">
            <a href="/forgot-password" className="text-gray-500 hover:text-gray-700">
              Forgot password?
            </a>
            <a href="/help" className="text-gray-500 hover:text-gray-700">
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
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>}>
      <LoginPageContent />
    </Suspense>
  )
}