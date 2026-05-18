import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import githubOAuthService from '@/api/githubOAuthService'
import GitHubMarkDark from '@/assets/github/github-mark.svg'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

/* ─── Animated graph canvas (shared with Landing) ───────────── */
function GraphCanvas() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    const NODES = 40, LINK_DIST = 130
    const nodes = []
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)
    for (let i = 0; i < NODES; i++) {
      nodes.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 1.8 + 1
      })
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < LINK_DIST) {
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(0,200,150,${0.2 * (1 - d / LINK_DIST)})`; ctx.lineWidth = 0.7; ctx.stroke()
          }
        }
      }
      nodes.forEach(n => {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,200,150,0.5)'; ctx.fill()
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-35 pointer-events-none" />
}

/* ─── Password strength ──────────────────────────────────────── */
function PasswordStrength({ password }) {
  if (!password) return null
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['', '#EF4444', '#F59E0B', '#3B82F6', '#00C896']
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-0.5 flex-1 rounded-full transition-all duration-300"
            style={{ background: i <= score ? colors[score] : 'var(--border-default)' }} />
        ))}
      </div>
      <p className="text-[10px] font-mono" style={{ color: colors[score] }}>{labels[score]}</p>
    </div>
  )
}

/* ─── Field with optional show/hide toggle ───────────────────── */
function PasswordField({ label, name, value, onChange, placeholder = '••••••••', showStrength = false }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          required
          className="field-input pr-10!"
          placeholder={show ? 'enter password' : placeholder}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-secondary) transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {showStrength && <PasswordStrength password={value} />}
    </div>
  )
}

/* ─── Main ───────────────────────────────────────────────────── */
function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, register, isLoading, error, clearError } = useAuthStore()
  const [authMode, setAuthMode] = useState('login')

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [signupForm, setSignupForm] = useState({
    firstName: '', lastName: '', username: '', email: '', password: '', confirmPassword: '',
  })

  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'signup' || mode === 'login') setAuthMode(mode)
  }, [searchParams])

  const getErrorMessage = (code) => ({
    OAUTH_ACCOUNT_EXISTS: 'An account with this email exists. Please login instead.',
    INVALID_OAUTH_STATE: 'Security check failed. Try GitHub auth again.',
    OAUTH_INVALID_CODE: 'GitHub code expired. Please try again.',
    OAUTH_PROVIDER_ERROR: 'Could not fetch GitHub profile. Try again.',
    BAD_REQUEST: 'Invalid request. Please try again.',
  }[code] || 'GitHub authentication failed. Please try again.')

  const handleLoginSubmit = async (e) => {
    e.preventDefault(); clearError()
    try { await login(loginForm); toast.success('Welcome back!'); navigate('/dashboard') }
    catch { toast.error(error || 'Login failed') }
  }

  const handleSignupSubmit = async (e) => {
    e.preventDefault(); clearError()
    if (signupForm.password !== signupForm.confirmPassword) { toast.error('Passwords do not match'); return }
    try {
      await register({
        fullname: `${signupForm.firstName} ${signupForm.lastName}`,
        username: signupForm.username, email: signupForm.email, password: signupForm.password
      })
      toast.success('Account created! Please verify your email.')
      navigate('/auth/verify')
    } catch { toast.error(error || 'Registration failed') }
  }

  const toggleMode = () => { clearError(); setAuthMode(m => m === 'login' ? 'signup' : 'login') }

  return (
    <div className="min-h-screen bg-(--bg-base) flex overflow-hidden">

      {/* ── Left branding panel ─────────────────────────── */}
      <div className="relative hidden lg:flex flex-col justify-between w-[42%] p-12 bg-(--bg-surface) border-r border-(--border-subtle) overflow-hidden">
        <GraphCanvas />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 30% 60%, rgba(0,200,150,0.08) 0%, transparent 70%)' }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 group">
            <span className="text-lg font-bold text-(--text-primary)" style={{ fontFamily: 'var(--font-mono)' }}>
              Graph<span className="text-(--accent-cyan)">LM</span>
            </span>
          </button>
        </div>

        {/* Mid copy */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <p className="text-[11px] font-mono text-(--accent-cyan) uppercase tracking-widest">
              Knowledge Graph Intelligence
            </p>
            <h2 className="text-3xl font-bold text-(--text-primary) leading-tight" style={{ fontFamily: 'var(--font-mono)' }}>
              Your documents,<br />now connected.
            </h2>
            <p className="text-sm text-(--text-secondary) leading-relaxed max-w-xs">
              Upload files or connect repos. GraphLM builds a knowledge graph and lets you chat with it in real time.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { icon: '🕸️', label: 'Interactive knowledge graph' },
              { icon: '⚡', label: 'Dual RAG — vector + graph' },
              { icon: '🎯', label: 'Precision source scoping' },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-3 text-sm text-(--text-secondary)">
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-[11px] text-(--text-muted) font-mono">
          BE Final Project · AISSMS IOIT · 2026
        </p>
      </div>

      {/* ── Right form panel ────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <button onClick={() => navigate('/')} className="text-xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
              Graph<span className="text-(--accent-cyan)">LM</span>
            </button>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-(--text-primary) mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
              {authMode === 'login' ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-sm text-(--text-secondary)">
              {authMode === 'login'
                ? 'Sign in to continue to GraphLM'
                : 'Start building your knowledge graph'}
            </p>
          </div>

          {/* OAuth error */}
          {searchParams.get('error') && (
            <div className="mb-4 p-3 bg-(--accent-amber-dim) text-(--accent-amber) rounded border border-(--accent-amber)/30 text-sm">
              <p className="font-medium mb-0.5">GitHub Authentication Failed</p>
              <p className="text-xs">{getErrorMessage(searchParams.get('error'))}</p>
            </div>
          )}

          {/* Server error */}
          {error && (
            <div className="mb-4 p-3 bg-(--accent-red-dim) text-(--accent-red) border border-(--accent-red)/30 rounded text-sm">
              {error}
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="field-label">Email</label>
                <input type="email" name="email" value={loginForm.email}
                  onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
                  required className="field-input" placeholder="you@example.com" autoComplete="email" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="field-label" style={{ marginBottom: 0 }}>Password</label>
                  <button type="button" onClick={() => navigate('/forgot-password')}
                    className="text-[11px] text-(--accent-cyan) hover:underline font-mono">
                    Forgot password?
                  </button>
                </div>
                <PasswordField name="password" label="" value={loginForm.password}
                  onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} />
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
                {isLoading ? 'Signing in…' : 'Sign in →'}
              </button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-(--border-subtle)" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-(--bg-base) text-(--text-muted) font-mono">or</span>
                </div>
              </div>

              <button type="button" onClick={() => githubOAuthService.redirectToGitHub()}
                className="btn-ghost w-full flex items-center justify-center gap-2">
                <img src={GitHubMarkDark} alt="GitHub" className="w-4 h-4 invert" />
                Continue with GitHub
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">First name</label>
                  <input type="text" name="firstName" value={signupForm.firstName}
                    onChange={e => setSignupForm(p => ({ ...p, firstName: e.target.value }))}
                    required className="field-input" placeholder="John" />
                </div>
                <div>
                  <label className="field-label">Last name</label>
                  <input type="text" name="lastName" value={signupForm.lastName}
                    onChange={e => setSignupForm(p => ({ ...p, lastName: e.target.value }))}
                    required className="field-input" placeholder="Doe" />
                </div>
              </div>

              <div>
                <label className="field-label">Username</label>
                <input type="text" name="username" value={signupForm.username}
                  onChange={e => setSignupForm(p => ({ ...p, username: e.target.value }))}
                  required className="field-input" placeholder="3–13 chars, a–z, 0–9, _ -" />
              </div>

              <div>
                <label className="field-label">Email</label>
                <input type="email" name="email" value={signupForm.email}
                  onChange={e => setSignupForm(p => ({ ...p, email: e.target.value }))}
                  required className="field-input" placeholder="you@example.com" />
              </div>

              <PasswordField label="Password" name="password" value={signupForm.password}
                onChange={e => setSignupForm(p => ({ ...p, password: e.target.value }))}
                showStrength />

              <PasswordField label="Confirm password" name="confirmPassword" value={signupForm.confirmPassword}
                onChange={e => setSignupForm(p => ({ ...p, confirmPassword: e.target.value }))} />

              <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
                {isLoading ? 'Creating account…' : 'Create account →'}
              </button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-(--border-subtle)" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-(--bg-base) text-(--text-muted) font-mono">or</span>
                </div>
              </div>

              <button type="button" onClick={() => githubOAuthService.redirectToGitHub()}
                className="btn-ghost w-full flex items-center justify-center gap-2">
                <img src={GitHubMarkDark} alt="GitHub" className="w-4 h-4 invert" />
                Sign up with GitHub
              </button>
            </form>
          )}

          {/* Switch mode */}
          <p className="text-center text-(--text-secondary) text-sm mt-6">
            {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={toggleMode} className="text-(--accent-cyan) hover:underline font-medium font-mono">
              {authMode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
