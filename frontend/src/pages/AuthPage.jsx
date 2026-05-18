import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import useThemeStore from '@/store/themeStore'
import githubOAuthService from '@/api/githubOAuthService'
import GitHubMarkDark from '@/assets/github/github-mark.svg'
import GitHubMarkWhite from '@/assets/github/github-mark-white.svg'
import { toast } from 'sonner'

function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, register, isLoading, error, clearError } = useAuthStore()
  const theme = useThemeStore((state) => state.theme)
  const gitHubLogo = GitHubMarkDark
  const [authMode, setAuthMode] = useState('login')

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })

  // Signup form state
  const [signupForm, setSignupForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  // Initialize auth mode from query param
  useEffect(() => {
    const modeFromUrl = searchParams.get('mode')
    if (modeFromUrl === 'signup' || modeFromUrl === 'login') {
      setAuthMode(modeFromUrl)
    }
  }, [searchParams])

  // Map error codes to user-friendly messages
  const getErrorMessage = (errorCode) => {
    const errorMessages = {
      OAUTH_ACCOUNT_EXISTS: "An account with this email already exists. Please login with your credentials instead.",
      INVALID_OAUTH_STATE: "Security check failed. Please try GitHub authentication again.",
      OAUTH_INVALID_CODE: "GitHub authentication code expired. Please try again.",
      OAUTH_PROVIDER_ERROR: "Failed to fetch your GitHub profile. Please try again.",
      BAD_REQUEST: "Invalid request. Please try again.",
    }
    return errorMessages[errorCode] || "GitHub authentication failed. Please try again."
  }

  const handleLoginChange = (e) => {
    const { name, value } = e.target
    setLoginForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSignupChange = (e) => {
    const { name, value } = e.target
    setSignupForm(prev => ({ ...prev, [name]: value }))
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    clearError()

    try {
      await login(loginForm)
      toast.success('Login successful!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(error || 'Login failed')
    }
  }

  const handleSignupSubmit = async (e) => {
    e.preventDefault()
    clearError()

    if (signupForm.password !== signupForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      await register({
        fullname: `${signupForm.firstName} ${signupForm.lastName}`,
        username: signupForm.username,
        email: signupForm.email,
        password: signupForm.password,
      })
      toast.success('Account created! Please verify your email.')
      navigate('/auth/verify')
    } catch (err) {
      toast.error(error || 'Registration failed')
    }
  }

  const toggleAuthMode = () => {
    clearError()
    setAuthMode(authMode === 'login' ? 'signup' : 'login')
  }

  const handleGitHubLogin = async () => {
    try {
      await githubOAuthService.redirectToGitHub()
    } catch (err) {
      // Errors are already surfaced by the axios interceptor toast handler.
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-md w-full max-w-md overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-[var(--border-subtle)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] text-center" style={{ fontFamily: 'var(--font-mono)' }}>
            {authMode === 'login' ? 'Login' : 'Create Account'}
          </h2>
        </div>

        <div className="px-8 py-6">
          {authMode === 'login' ? (
            // Login Form
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* OAuth Error Message */}
              {searchParams.get('error') && (
                <div className="p-3 bg-[var(--accent-amber-dim)] text-[var(--accent-amber)] rounded border border-[var(--accent-amber)]/30 text-sm">
                  <p className="font-medium mb-1">GitHub Authentication Failed</p>
                  <p>{getErrorMessage(searchParams.get('error'))}</p>
                </div>
              )}

              <div>
                <label className="field-label">Email</label>
                <input
                  type="email"
                  name="email"
                  value={loginForm.email}
                  onChange={handleLoginChange}
                  required
                  className="field-input"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="field-label">Password</label>
                <input
                  type="password"
                  name="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  required
                  className="field-input"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="mt-2 text-xs text-[var(--accent-cyan)] hover:underline"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Forgot Password?
                </button>
              </div>

              {error && (
                <div className="p-3 bg-[var(--accent-red-dim)] text-[var(--accent-red)] border border-[var(--accent-red)]/30 rounded text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border-subtle)]"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-[var(--bg-elevated)] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-mono)' }}>or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGitHubLogin}
                className="btn-ghost w-full flex items-center justify-center gap-2"
              >
                <img src={gitHubLogo} alt="GitHub" className="w-4 h-4 invert" />
                <span>Continue with GitHub</span>
              </button>
            </form>
          ) : (
            // Signup Form
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={signupForm.firstName}
                    onChange={handleSignupChange}
                    required
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={signupForm.lastName}
                    onChange={handleSignupChange}
                    required
                    className="field-input"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Username</label>
                <input
                  type="text"
                  name="username"
                  value={signupForm.username}
                  onChange={handleSignupChange}
                  required
                  className="field-input"
                  placeholder="3-13 chars, alphanumeric + _ or -"
                />
              </div>

              <div>
                <label className="field-label">Email</label>
                <input
                  type="email"
                  name="email"
                  value={signupForm.email}
                  onChange={handleSignupChange}
                  required
                  className="field-input"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="field-label">Password</label>
                <input
                  type="password"
                  name="password"
                  value={signupForm.password}
                  onChange={handleSignupChange}
                  required
                  className="field-input"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="field-label">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={signupForm.confirmPassword}
                  onChange={handleSignupChange}
                  required
                  className="field-input"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="p-3 bg-[var(--accent-red-dim)] text-[var(--accent-red)] border border-[var(--accent-red)]/30 rounded text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? 'Creating account...' : 'Sign Up'}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border-subtle)]"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-[var(--bg-elevated)] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-mono)' }}>or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => githubOAuthService.redirectToGitHub()}
                className="btn-ghost w-full flex items-center justify-center gap-2"
              >
                <img src={gitHubLogo} alt="GitHub" className="w-4 h-4 invert" />
                <span>Sign up with GitHub</span>
              </button>
            </form>
          )}

          <p className="text-center text-[var(--text-secondary)] text-sm mt-6">
            {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={toggleAuthMode}
              className="text-[var(--accent-cyan)] hover:underline font-medium"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {authMode === 'login' ? 'Sign up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
