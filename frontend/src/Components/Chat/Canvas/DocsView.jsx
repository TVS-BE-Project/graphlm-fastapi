import { FileText, Sparkles } from 'lucide-react'

export function DocsView() {
  return (
    <div className="flex flex-col h-full items-center justify-center px-6 text-center gap-4">
      <div className="w-12 h-12 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center">
        <FileText className="w-6 h-6 text-[var(--text-muted)]" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
          Docs Workspace
        </h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-xs leading-relaxed">
          Generate structured documentation, summaries, and knowledge reports from your sources.
        </p>
      </div>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-[var(--border-default)] text-[var(--text-muted)] text-[10px] font-medium" style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        <Sparkles className="w-3 h-3" />
        Coming soon
      </div>
    </div>
  )
}
