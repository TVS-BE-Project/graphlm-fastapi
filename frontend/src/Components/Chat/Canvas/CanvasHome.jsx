import { Network, FileText, ChevronRight, Info } from 'lucide-react'

const tools = [
  {
    id: 'graph',
    name: 'Graph View',
    description: 'Explore knowledge as an interactive network',
    icon: Network,
    iconColor: 'text-[var(--accent-cyan)]',
    iconBg: 'bg-[var(--accent-cyan-dim)]',
    available: true,
  },
  {
    id: 'docs',
    name: 'Docs',
    description: 'Generate structured documentation from sources',
    icon: FileText,
    iconColor: 'text-[var(--text-muted)]',
    iconBg: 'bg-[var(--bg-elevated)]',
    available: false, // coming soon
  },
]

export function CanvasHome({ onSelectTool, selectedSources = [] }) {
  const hasSelection = selectedSources.length > 0

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Info banner — shown when nothing is selected */}
      {!hasSelection && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded bg-[var(--accent-amber-dim)] border border-[var(--accent-amber)]/30 mb-1">
          <Info className="w-3.5 h-3.5 text-[var(--accent-amber)] shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--accent-amber)] leading-snug" style={{ fontFamily: 'var(--font-mono)' }}>
            Select at least one source from the left panel to enable Canvas tools.
          </p>
        </div>
      )}

      <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-widest mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
        Tools
      </p>
      {tools.map((tool) => {
        // A tool is interactive only if it's built and sources are selected
        const isActive = tool.available && hasSelection
        const isDisabled = !tool.available || !hasSelection
        const disabledReason = !hasSelection
          ? 'Select sources to enable'
          : 'Coming soon'

        return (
          <button
            key={tool.id}
            onClick={() => isActive && onSelectTool(tool.id)}
            disabled={isDisabled}
            title={isDisabled ? disabledReason : ''}
            className={`
              group relative w-full flex items-center gap-3 p-3 rounded border text-left transition-all duration-150
              ${isActive
                ? 'bg-[var(--bg-elevated)] border-[var(--border-default)] hover:border-[var(--accent-cyan)] hover:bg-[var(--bg-hover)] cursor-pointer'
                : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] cursor-not-allowed opacity-50'
              }
            `}
          >
            <div className={`shrink-0 w-8 h-8 rounded flex items-center justify-center ${tool.iconBg}`}>
              <tool.icon className={`w-4 h-4 ${tool.iconColor}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-mono)' }}>
                  {tool.name}
                </span>
                {!tool.available && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-muted)] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>
                    Soon
                  </span>
                )}
                {tool.available && !hasSelection && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--accent-amber-dim)] text-[var(--accent-amber)] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>
                    Select sources
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                {tool.description}
              </p>
            </div>

            {isActive && (
              <ChevronRight className="shrink-0 w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent-cyan)] transition-colors" />
            )}
          </button>
        )
      })}
    </div>
  )
}
