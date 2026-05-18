import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, CheckCircle, AlertCircle } from 'lucide-react'
import authService from '@/api/authService'
import { toast } from 'sonner'

function EmailVerifiedPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [verificationStatus, setVerificationStatus] = useState('pending') // pending | success | error
  const [email, setEmail] = useState('')
  const [showResend, setShowResend] = useState(false)

  const token = searchParams.get('token')

  useEffect(() => {
    // If token is provided, automatically verify
    if (token) {
      verifyEmail(token)
    } else {
      // No token provided, show error
      setVerificationStatus('error')
    }
  }, [token])

  const verifyEmail = async (emailToken) => {
    try {
      setVerificationStatus('pending')
      await authService.verifyEmail(emailToken)
      setVerificationStatus('success')
      toast.success('Email verified successfully!')
      setTimeout(() => navigate('/auth?mode=login'), 2000)
    } catch (err) {
      setVerificationStatus('error')
      const errorMessage = err.response?.data?.message || 'Email verification failed'
      toast.error(errorMessage)
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
                Verifying Your Email
              </h2>
              <p className="text-(--text-secondary) mb-4 text-sm">
                Please wait while we verify your email address...
              </p>
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
                onClick={() => navigate('/auth?mode=login')}
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
                The verification link is invalid or has expired. Please request a new verification email.
              </p>

              <button
                onClick={() => setShowResend(!showResend)}
                className="btn-primary w-full mb-3"
              >
                Resend Verification Email
              </button>

              {showResend && (
                <form onSubmit={handleResendEmail} className="space-y-3 mt-4 pt-4 border-t border-(--border-subtle)">
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
                onClick={() => navigate('/auth?mode=login')}
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

export default EmailVerifiedPage
