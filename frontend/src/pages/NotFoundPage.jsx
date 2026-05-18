import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
      <div className="text-center px-4">
        <AlertCircle className="w-16 h-16 text-[var(--accent-red)] mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
          404
        </h1>
        <p className="text-xl text-[var(--text-secondary)] mb-8">
          Page not found
        </p>
        <button
          onClick={() => navigate('/')}
          className="btn-primary px-6"
        >
          Go Home
        </button>
      </div>
    </div>
  )
}
