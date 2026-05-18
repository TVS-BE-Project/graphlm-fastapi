import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, CheckCircle, AlertCircle } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import authService from '@/api/authService'
import { toast } from 'sonner'

function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [verificationStatus, setVerificationStatus] = useState('pending') // pending | success | error
  const [email, setEmail] = useState('')
  const [showResend, setShowResend] = useState(false)
  const { isAuthenticated } = useAuthStore()

  const token = searchParams.get('token')

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    if (isAuthenticated) {
      navigate('/dashboard')
      return
    }

    // If token is provided, automatically verify
    if (token) {
      verifyEmail(token)
    }
  }, [token, isAuthenticated, navigate])

  const verifyEmail = async (emailToken) => {
    try {
      setVerificationStatus('pending')
      await authService.verifyEmail(emailToken)
      setVerificationStatus('success')
      toast.success('Email verified successfully!')
      setTimeout(() => navigate('/auth'), 2000)
    } catch (err) {
      setVerificationStatus('error')
      toast.error('Email verification failed')
    }
  }

  const handleResendEmail = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Please enter your email')
      return
    }

    try {
      await authService.resendEmailVerification(email)
      toast.success('Verification email sent! Check your inbox.')
      setShowResend(false)
    } catch (err) {
      toast.error('Failed to resend verification email')
    }
  }

  return (
    <div className="min-h-screen bg-(--bg-base) flex items-center justify-center p-4">
      <div className="bg-(--bg-elevated) border border-(--border-strong) rounded-md w-full max-w-md overflow-hidden shadow-xl">
        <div className="p-8 text-center">
          {verificationStatus === 'pending' && (
            <>
              <Mail className="w-12 h-12 text-(--accent-cyan) mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-(--text-primary) mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                Verify Your Email
              </h2>
              <p className="text-(--text-secondary) mb-4 text-sm">
                We've sent a verification link to your email address. Please check your inbox and verify your email.
              </p>

              <button
                onClick={() => setShowResend(!showResend)}
                className="text-(--accent-cyan) hover:underline text-sm mb-4"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {showResend ? 'Hide' : 'Didn\'t receive email?'}
              </button>

              {showResend && (
                <form onSubmit={handleResendEmail} className="space-y-3 mt-4 pt-4 border-t border-(--border-subtle) text-left">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="field-input"
                  />
                  <button
                    type="submit"
                    className="btn-primary w-full"
                  >
                    Resend Verification Email
                  </button>
                </form>
              )}
            </>
          )}

          {verificationStatus === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-(--accent-cyan) mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-(--text-primary) mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                Email Verified!
              </h2>
              <p className="text-(--text-secondary) mb-6 text-sm">
                Your email has been verified successfully. You can now login to your account.
              </p>
              <button
                onClick={() => navigate('/auth')}
                className="btn-primary w-full"
              >
                Go to Login
              </button>
            </>
          )}

          {verificationStatus === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 text-(--accent-red) mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-(--text-primary) mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                Verification Failed
              </h2>
              <p className="text-(--text-secondary) mb-6 text-sm">
                The verification link is invalid or has expired. Please try again.
              </p>

              <button
                onClick={() => setShowResend(!showResend)}
                className="btn-primary w-full mb-3"
              >
                Resend Verification Email
              </button>

              {showResend && (
                <form onSubmit={handleResendEmail} className="space-y-3 mt-4 pt-4 border-t border-(--border-subtle) text-left">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="field-input"
                  />
                  <button
                    type="submit"
                    className="btn-primary w-full"
                  >
                    Resend
                  </button>
                </form>
              )}

              <button
                onClick={() => navigate('/auth')}
                className="w-full text-(--accent-cyan) hover:underline text-sm font-medium py-2 px-4 mt-3"
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

export default VerifyEmailPage
