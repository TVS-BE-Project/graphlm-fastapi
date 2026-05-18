import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import authService from '@/api/authService'
import { toast } from 'sonner'
import AuthShell from '@/Components/Auth/AuthShell'

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email'); return }
    try {
      setStatus('loading'); setError('')
      await authService.forgotPassword(email)
      setStatus('success')
      toast.success('Reset email sent! Check your inbox.')
    } catch (err) {
      setStatus('error')
      const msg = err.response?.data?.message || 'Failed to send reset email. Please try again.'
      setError(msg); toast.error(msg)
    }
  }

  return (
    <AuthShell>
      <div className="w-full max-w-sm">

        {/* Back link */}
        <button
          onClick={() => navigate('/auth?mode=login')}
          className="flex items-center gap-1.5 text-(--text-muted) hover:text-(--text-primary) text-sm mb-8 transition-colors"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to login
        </button>

        {(status === 'idle' || status === 'loading') && (
          <>
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-(--accent-cyan-dim) flex items-center justify-center mb-6">
              <Mail className="w-6 h-6 text-(--accent-cyan)" />
            </div>

            <h1 className="text-2xl font-bold text-(--text-primary) mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
              Forgot password?
            </h1>
            <p className="text-sm text-(--text-secondary) mb-8">
              No worries — enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="field-label">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="field-input"
                  disabled={status === 'loading'}
                  autoFocus
                />
              </div>

              {error && (
                <div className="text-sm text-(--accent-red) bg-(--accent-red-dim) border border-(--accent-red)/30 rounded px-3 py-2">
                  {error}
                </div>
              )}

              <button type="submit" disabled={status === 'loading'} className="btn-primary w-full">
                {status === 'loading' ? 'Sending…' : 'Send reset link →'}
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
              Check your inbox
            </h1>
            <p className="text-sm text-(--text-secondary) mb-1">
              We sent a reset link to
            </p>
            <p className="text-sm font-medium text-(--accent-cyan) mb-4 font-mono">{email}</p>
            <p className="text-xs text-(--text-muted) mb-8">
              The link will expire in 20 minutes. Check your spam folder if you don't see it.
            </p>
            <button onClick={() => navigate('/auth?mode=login')} className="btn-primary w-full">
              Back to login
            </button>
            <button
              onClick={() => { setStatus('idle'); setEmail('') }}
              className="mt-3 w-full text-sm text-(--text-muted) hover:text-(--text-secondary) font-mono transition-colors"
            >
              Resend email
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-(--accent-red-dim) flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-(--accent-red)" />
            </div>
            <h1 className="text-2xl font-bold text-(--text-primary) mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
              Something went wrong
            </h1>
            <p className="text-sm text-(--text-secondary) mb-8">{error}</p>
            <button onClick={() => { setStatus('idle'); setError(''); setEmail('') }} className="btn-primary w-full mb-3">
              Try again
            </button>
            <button onClick={() => navigate('/auth?mode=login')}
              className="w-full text-sm text-(--accent-cyan) hover:underline font-mono">
              Back to login
            </button>
          </div>
        )}
      </div>
    </AuthShell>
  )
}

export default ForgotPasswordPage
