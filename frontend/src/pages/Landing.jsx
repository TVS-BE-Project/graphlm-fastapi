import { useNavigate } from 'react-router-dom'

function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
      <div className="text-center px-4">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full border border-[var(--border-default)] text-[var(--text-muted)] text-xs font-mono tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] inline-block" />
            Knowledge Graph Intelligence
          </div>
          <h1 className="text-6xl font-bold text-[var(--text-primary)] mb-4" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
            GraphLM
          </h1>
          <p className="text-lg text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-sans)' }}>
            Chat with your knowledge graphs
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => navigate('/auth?mode=login')}
            className="btn-primary w-56"
          >
            Login
          </button>
          <button
            onClick={() => navigate('/auth?mode=signup')}
            className="btn-ghost w-56"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  )
}

export default Landing
