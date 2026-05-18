import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, CheckCircle, AlertCircle } from 'lucide-react'
import authService from '@/api/authService'
import { toast } from 'sonner'

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email')
      return
    }

    try {
      setStatus('loading')
      setError('')
      await authService.forgotPassword(email)
      setStatus('success')
      toast.success('Reset email sent! Check your inbox.')
    } catch (err) {
      setStatus('error')
      const errorMessage =
        err.response?.data?.message || 'Failed to send reset email. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-md w-full max-w-md overflow-hidden shadow-xl">
        <div className="p-8 text-center">
          {(status === 'idle' || status === 'loading') && (
            <>
              <Mail className="w-12 h-12 text-[var(--accent-cyan)] mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                Reset Your Password
              </h2>
              <p className="text-[var(--text-secondary)] mb-6 text-sm">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="field-input"
                    disabled={status === 'loading'}
                  />
                </div>

                {error && (
                  <div className="text-sm text-[var(--accent-red)] bg-[var(--accent-red-dim)] border border-[var(--accent-red)]/30 rounded px-3 py-2">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="btn-primary w-full"
                >
                  {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <button
                onClick={() => navigate('/auth?mode=login')}
                className="w-full text-[var(--accent-cyan)] hover:underline text-sm font-medium py-2 px-4 mt-4"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Back to Login
              </button>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-[var(--accent-cyan)] mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                Email Sent!
              </h2>
              <p className="text-[var(--text-secondary)] mb-4 text-sm">
                We've sent a password reset link to {email}. Please check your inbox and follow
                the link to reset your password.
              </p>
              <p className="text-xs text-[var(--text-muted)] mb-6">
                The link will expire in 20 minutes.
              </p>

              <button
                onClick={() => navigate('/auth?mode=login')}
                className="btn-primary w-full"
              >
                Go to Login
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 text-[var(--accent-red)] mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                Something Went Wrong
              </h2>
              <p className="text-[var(--text-secondary)] mb-6 text-sm">{error}</p>

              <button
                onClick={() => {
                  setStatus('idle')
                  setError('')
                  setEmail('')
                }}
                className="btn-primary w-full mb-3"
              >
                Try Again
              </button>

              <button
                onClick={() => navigate('/auth?mode=login')}
                className="w-full text-[var(--accent-cyan)] hover:underline text-sm font-medium py-2 px-4"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Back to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
