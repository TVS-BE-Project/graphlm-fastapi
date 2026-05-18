import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import authService from '@/api/authService'
import { toast } from 'sonner'
import AuthShell from '@/Components/Auth/AuthShell'

function PasswordField({ label, value, onChange, placeholder, disabled }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={show ? 'enter password' : placeholder}
          className="field-input pr-10!"
          disabled={disabled}
        />
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-secondary) transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [showResend, setShowResend] = useState(false)
  const [email, setEmail] = useState('')

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) { setStatus('error'); setError('Invalid reset link. No token provided.') }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password.trim()) { setError('Please enter a password'); return }
    if (!confirmPassword.trim()) { setError('Please confirm your password'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    try {
      setStatus('loading'); setError('')
      await authService.resetPassword(token, password)
      setStatus('success')
      toast.success('Password reset successfully!')
      setTimeout(() => navigate('/auth?mode=login'), 2000)
    } catch (err) {
      setStatus('error')
      const msg = err.response?.data?.message || 'Failed to reset password. Please try again.'
      setError(msg); toast.error(msg)
      if (msg.includes('token') || msg.includes('expired')) setShowResend(true)
    }
  }

  const handleResendEmail = async (e) => {
    e.preventDefault()
    if (!email.trim()) { toast.error('Please enter your email'); return }
    try {
      await authService.forgotPassword(email)
      toast.success('Reset email sent! Check your inbox.')
      setShowResend(false); setEmail('')
    } catch { toast.error('Failed to send reset email') }
  }

  return (
    <AuthShell>
      <div className="w-full max-w-sm">

        <button
          onClick={() => navigate('/auth?mode=login')}
          className="flex items-center gap-1.5 text-(--text-muted) hover:text-(--text-primary) text-sm mb-8 transition-colors"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to login
        </button>

        {(status === 'idle' || status === 'loading') && (
          <>
            <div className="w-12 h-12 rounded-xl bg-(--accent-cyan-dim) flex items-center justify-center mb-6">
              <Lock className="w-6 h-6 text-(--accent-cyan)" />
            </div>
            <h1 className="text-2xl font-bold text-(--text-primary) mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
              Set new password
            </h1>
            <p className="text-sm text-(--text-secondary) mb-8">
              Choose a strong password for your account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <PasswordField label="New password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" disabled={status === 'loading'} />

              <PasswordField label="Confirm password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••" disabled={status === 'loading'} />

              {error && (
                <div className="text-sm text-(--accent-red) bg-(--accent-red-dim) border border-(--accent-red)/30 rounded px-3 py-2">
                  {error}
                </div>
              )}

              <button type="submit" disabled={status === 'loading' || !token} className="btn-primary w-full">
                {status === 'loading' ? 'Resetting…' : 'Reset password →'}
              </button>
            </form>
          </>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-(--accent-cyan-dim) flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-(--accent-cyan)" />
            </div>
            <h1 className="text-2xl font-bold text-(--text-primary) mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
              Password updated!
            </h1>
            <p className="text-sm text-(--text-secondary) mb-8">
              Your password has been reset. Redirecting you to login…
            </p>
            <button onClick={() => navigate('/auth?mode=login')} className="btn-primary w-full">
              Go to login
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-(--accent-red-dim) flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-(--accent-red)" />
            </div>
            <h1 className="text-2xl font-bold text-(--text-primary) mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
              Reset failed
            </h1>
            <p className="text-sm text-(--text-secondary) mb-6">{error}</p>

            {!showResend && (
              <button onClick={() => { setStatus('idle'); setError(''); setPassword(''); setConfirmPassword('') }}
                className="btn-primary w-full mb-3">
                Try again
              </button>
            )}

            {showResend && (
              <form onSubmit={handleResendEmail} className="space-y-3 mt-4 pt-4 border-t border-(--border-subtle) text-left">
                <label className="field-label">Send a new reset link to</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" className="field-input" />
                <button type="submit" className="btn-primary w-full">Resend reset email</button>
              </form>
            )}

            <button onClick={() => navigate('/auth?mode=login')}
              className="mt-3 w-full text-sm text-(--accent-cyan) hover:underline font-mono">
              Back to login
            </button>
          </div>
        )}
      </div>
    </AuthShell>
  )
}

export default ResetPasswordPage
