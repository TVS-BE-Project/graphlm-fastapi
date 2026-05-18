import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'

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
      nodes.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 1.8 + 1 })
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < LINK_DIST) {
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(0,200,150,${0.18 * (1 - d / LINK_DIST)})`; ctx.lineWidth = 0.7; ctx.stroke()
          }
        }
      }
      nodes.forEach(n => {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,200,150,0.45)'; ctx.fill()
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" />
}

/**
 * Shared wrapper for auth-adjacent pages (ForgotPassword, ResetPassword, etc.)
 * Provides the animated graph background + centered card layout.
 */
export default function AuthShell({ children }) {
  const navigate = useNavigate()
  return (
    <div className="relative min-h-screen bg-(--bg-base) flex flex-col overflow-hidden">
      <GraphCanvas />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(0,200,150,0.06) 0%, transparent 70%)' }} />

      {/* Top nav */}
      <header className="relative z-10 px-8 py-5">
        <button onClick={() => navigate('/')} className="text-sm font-semibold text-(--text-primary)"
          style={{ fontFamily: 'var(--font-mono)' }}>
          Graph<span className="text-(--accent-cyan)">LM</span>
        </button>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        {children}
      </main>

      <footer className="relative z-10 text-center pb-5 text-[11px] text-(--text-muted)" style={{ fontFamily: 'var(--font-mono)' }}>
        BE Final Project · AISSMS IOIT · 2026
      </footer>
    </div>
  )
}
