import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import GraphLMLogo from '@/Components/Common/GraphLMLogo'

/* ─── Animated graph-network canvas background ───────────────── */
function GraphCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    const NODES = 55
    const LINK_DIST = 160
    const nodes = []

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < NODES; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 2 + 1.5,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < LINK_DIST) {
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(0,200,150,${0.18 * (1 - d / LINK_DIST)})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }

      // nodes
      nodes.forEach(n => {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,200,150,0.55)'
        ctx.fill()
      })

      // move
      nodes.forEach(n => {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
      })

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
    />
  )
}

/* ─── Typewriter hook ─────────────────────────────────────────── */
const PHRASES = [
  'Chat with your research papers.',
  'Explore codebases as knowledge graphs.',
  'Ask questions across all your documents.',
  'Discover hidden connections in your data.',
]

function useTypewriter(phrases, speed = 48, pause = 1800) {
  const [display, setDisplay] = useState('')
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = phrases[phraseIdx]
    let timeout

    if (!deleting && charIdx <= current.length) {
      timeout = setTimeout(() => {
        setDisplay(current.slice(0, charIdx))
        setCharIdx(c => c + 1)
      }, speed)
    } else if (!deleting && charIdx > current.length) {
      timeout = setTimeout(() => setDeleting(true), pause)
    } else if (deleting && charIdx >= 0) {
      timeout = setTimeout(() => {
        setDisplay(current.slice(0, charIdx))
        setCharIdx(c => c - 1)
      }, speed / 2)
    } else {
      setDeleting(false)
      setPhraseIdx(i => (i + 1) % phrases.length)
    }

    return () => clearTimeout(timeout)
  }, [charIdx, deleting, phraseIdx, phrases, speed, pause])

  return display
}

/* ─── Feature card ────────────────────────────────────────────── */
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="group relative flex flex-col gap-3 p-5 rounded-lg border border-(--border-subtle) bg-(--bg-surface) hover:border-(--accent-cyan)/40 hover:bg-(--bg-elevated) transition-all duration-300">
      <div className="w-9 h-9 rounded-md bg-(--accent-cyan-dim) flex items-center justify-center text-(--accent-cyan) text-lg group-hover:scale-110 transition-transform duration-200">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-(--text-primary)" style={{ fontFamily: 'var(--font-mono)' }}>{title}</h3>
      <p className="text-xs text-(--text-secondary) leading-relaxed">{desc}</p>
      {/* subtle glow on hover */}
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(0,200,150,0.15)' }} />
    </div>
  )
}

/* ─── Stat pill ───────────────────────────────────────────────── */
function Stat({ value, label }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-2xl font-bold text-(--accent-cyan)" style={{ fontFamily: 'var(--font-mono)' }}>{value}</span>
      <span className="text-[11px] uppercase tracking-widest text-(--text-muted)" style={{ fontFamily: 'var(--font-mono)' }}>{label}</span>
    </div>
  )
}

/* ─── Main page ───────────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate()
  const typewriter = useTypewriter(PHRASES)

  return (
    <div className="relative min-h-screen bg-(--bg-base) flex flex-col overflow-hidden">
      {/* Animated background */}
      <GraphCanvas />

      {/* Radial glow at centre */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(0,200,150,0.07) 0%, transparent 70%)' }}
      />

      {/* Top nav bar */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <GraphLMLogo variant="full" height={26} />
        <nav className="flex items-center gap-3">
          <button
            onClick={() => navigate('/auth?mode=login')}
            className="btn-ghost"
            style={{ height: 34, padding: '0 16px', fontSize: 12 }}
          >
            Log in
          </button>
          <button
            onClick={() => navigate('/auth?mode=signup')}
            className="btn-primary"
            style={{ height: 34, padding: '0 16px', fontSize: 12 }}
          >
            Get started →
          </button>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-10 pb-24">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full border border-(--border-default) bg-(--bg-surface)/60 backdrop-blur-sm text-(--text-muted) text-[11px] font-mono tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-(--accent-cyan) animate-pulse inline-block" />
          Knowledge Graph Intelligence
        </div>

        {/* Title */}
        <h1
          className="text-7xl font-bold text-(--text-primary) mb-6 leading-none"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}
        >
          Graph<span className="text-(--accent-cyan)">LM</span>
        </h1>

        {/* Typewriter subtitle */}
        <p
          className="text-xl text-(--text-secondary) mb-3 min-h-8"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {typewriter}
          <span className="inline-block w-0.5 h-5 bg-(--accent-cyan) ml-0.5 align-middle animate-pulse" />
        </p>
        <p className="text-sm text-(--text-muted) max-w-md mb-12">
          Upload documents or connect GitHub repos. GraphLM indexes them into a dual knowledge store — vector + graph — and lets you chat, explore, and visualise in real time.
        </p>

        {/* CTAs */}
        <div className="flex items-center gap-4 mb-20">
          <button
            onClick={() => navigate('/auth?mode=signup')}
            className="btn-primary"
            style={{ height: 44, padding: '0 28px', fontSize: 13 }}
          >
            Start for free →
          </button>
          <button
            onClick={() => navigate('/auth?mode=login')}
            className="btn-ghost"
            style={{ height: 44, padding: '0 28px', fontSize: 13 }}
          >
            Sign in
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-10 mb-20 px-8 py-5 rounded-xl border border-(--border-subtle) bg-(--bg-surface)/50 backdrop-blur-sm">
          <Stat value="Dual" label="RAG pipeline" />
          <div className="w-px h-8 bg-(--border-default)" />
          <Stat value="Neo4j" label="Graph DB" />
          <div className="w-px h-8 bg-(--border-default)" />
          <Stat value="Qdrant" label="Vector DB" />
          <div className="w-px h-8 bg-(--border-default)" />
          <Stat value="SSE" label="Real-time" />
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full">
          <FeatureCard
            icon="🕸️"
            title="Knowledge Graph"
            desc="Entities and relationships extracted from your documents, visualised as an interactive network."
          />
          <FeatureCard
            icon="⚡"
            title="Dual RAG"
            desc="Combines semantic vector search with graph traversal for deeply accurate, grounded answers."
          />
          <FeatureCard
            icon="🎯"
            title="Source Scoping"
            desc="Select exactly which sources the AI can access. Fine-grained control, zero hallucination."
          />
          <FeatureCard
            icon="🐙"
            title="GitHub Import"
            desc="Connect any public repository and chat with its code, docs, and structure instantly."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-6 text-[11px] text-(--text-muted)" style={{ fontFamily: 'var(--font-mono)' }}>
        BE Final Project · AISSMS IOIT · 2026
      </footer>
    </div>
  )
}
