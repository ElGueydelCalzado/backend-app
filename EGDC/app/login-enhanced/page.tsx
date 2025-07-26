'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Mail, Phone, Lock, Eye, EyeOff, 
  Chrome, Apple, MessageSquare, ArrowLeft,
  CheckCircle2, AlertCircle, Loader2
} from 'lucide-react'

type AuthMethod = 'email' | 'phone' | 'google' | 'apple' | 'magic-link'
type UserType = 'retailer' | 'supplier' | null

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Form state
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email')
  const [userType, setUserType] = useState<UserType>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [smsCodeSent, setSmsCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    // Get redirect URL from query params
    const redirect = searchParams.get('redirect')
    const userTypeParam = searchParams.get('type') as UserType
    
    if (userTypeParam) {
      setUserType(userTypeParam)
    }
    
    // Clear any existing error
    setError('')
  }, [searchParams])

  // Countdown timer for SMS resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Email and password are required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else if (result?.ok) {
        // Get session to determine redirect - path-based architecture
        const session = await getSession()
        if (session?.user?.tenant_subdomain) {
          const tenantPath = session.user.tenant_subdomain.replace('preview-', '').replace('mock-', '')
          const redirectUrl = `https://app.lospapatos.com/${tenantPath}/dashboard`
          window.location.href = redirectUrl
        } else {
          router.push('/dashboard')
        }
      }
    } catch (error) {
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phone) {
      setError('Phone number is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      if (!smsCodeSent) {
        // Send SMS code
        const result = await signIn('phone', {
          phone,
          redirect: false,
        })

        if (result?.error === 'SMS_CODE_SENT') {
          setSmsCodeSent(true)
          setSuccess('Verification code sent to your phone')
          setCountdown(60) // 60 second countdown
        } else {
          setError(result?.error || 'Failed to send verification code')
        }
      } else {
        // Verify SMS code
        if (!smsCode) {
          setError('Verification code is required')
          return
        }

        const result = await signIn('phone', {
          phone,
          code: smsCode,
          redirect: false,
        })

        if (result?.error) {
          setError(result.error)
        } else if (result?.ok) {
          const session = await getSession()
          if (session?.user?.tenant_subdomain) {
            const tenantPath = session.user.tenant_subdomain.replace('preview-', '').replace('mock-', '')
            const redirectUrl = `https://app.lospapatos.com/${tenantPath}/dashboard`
            window.location.href = redirectUrl
          } else {
            router.push('/dashboard')
          }
        }
      }
    } catch (error) {
      setError('Phone authentication failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setIsLoading(true)
    setError('')

    try {
      await signIn(provider, {
        callbackUrl: searchParams.get('redirect') || '/dashboard'
      })
    } catch (error) {
      setError(`${provider} login failed. Please try again.`)
      setIsLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setError('Email is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await signIn('email', { 
        email,
        callbackUrl: '/dashboard'
      })
      setSuccess('Magic link sent to your email!')
    } catch (error) {
      setError('Failed to send magic link. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resendSMSCode = async () => {
    if (countdown > 0) return
    
    setIsLoading(true)
    try {
      await signIn('phone', {
        phone,
        redirect: false,
      })
      setSuccess('New verification code sent')
      setCountdown(60)
    } catch (error) {
      setError('Failed to resend code')
    } finally {
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
            { id: 'email', label: 'Email', icon: Mail },
            { id: 'phone', label: 'Phone', icon: Phone },
            { id: 'magic-link', label: 'Magic Link', icon: MessageSquare }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setAuthMethod(id as AuthMethod)
                setError('')
                setSuccess('')
                setSmsCodeSent(false)
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

        {/* Email & Password Form */}
        {authMethod === 'email' && (
          <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your@email.com"
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
                  placeholder="Enter your password"
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

        {/* Phone & SMS Form */}
        {authMethod === 'phone' && (
          <form onSubmit={handlePhoneLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+1234567890"
                  required
                  disabled={smsCodeSent}
                />
              </div>
            </div>

            {smsCodeSent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value)}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-center"
                    placeholder="123456"
                    maxLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={resendSMSCode}
                    disabled={countdown > 0 || isLoading}
                    className="px-4 py-3 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                  >
                    {countdown > 0 ? `${countdown}s` : 'Resend'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {smsCodeSent ? 'Verifying...' : 'Sending code...'}
                </>
              ) : (
                smsCodeSent ? 'Verify Code' : 'Send Verification Code'
              )}
            </button>
          </form>
        )}

        {/* Magic Link Form */}
        {authMethod === 'magic-link' && (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Sending magic link...
                </>
              ) : (
                'Send Magic Link'
              )}
            </button>

            <p className="text-sm text-gray-600 text-center">
              We'll send you a secure link to sign in without a password
            </p>
          </form>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Chrome className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Continue with Google</span>
          </button>

          <button
            onClick={() => handleOAuthLogin('apple')}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Apple className="w-5 h-5" />
            <span className="font-medium">Continue with Apple</span>
          </button>
        </div>

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
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading login page...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}