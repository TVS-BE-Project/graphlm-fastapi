import { Network, FileText, ChevronRight, Info } from 'lucide-react'

const tools = [
  {
    id: 'graph',
    name: 'Graph View',
    description: 'Explore knowledge as an interactive network',
    icon: Network,
    iconColor: 'text-(--accent-cyan)',
    iconBg: 'bg-(--accent-cyan-dim)',
    available: true,
  },
  {
    id: 'docs',
    name: 'Docs',
    description: 'Generate structured documentation from sources',
    icon: FileText,
    iconColor: 'text-(--text-muted)',
    iconBg: 'bg-(--bg-elevated)',
    available: false, // coming soon
  },
]

export function CanvasHome({ onSelectTool, selectedSources = [] }) {
  const hasSelection = selectedSources.length > 0

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Info banner — shown when nothing is selected */}
      {!hasSelection && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded bg-(--accent-amber-dim) border border-(--accent-amber)/30 mb-1">
          <Info className="w-3.5 h-3.5 text-(--accent-amber) shrink-0 mt-0.5" />
          <p className="text-xs text-(--accent-amber) leading-snug" style={{ fontFamily: 'var(--font-mono)' }}>
            Select at least one source from the left panel to enable Canvas tools.
          </p>
        </div>
      )}

      <p className="text-[10px] text-(--text-muted) font-medium uppercase tracking-widest mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
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
                ? 'bg-(--bg-elevated) border-(--border-default) hover:border-(--accent-cyan) hover:bg-(--bg-hover) cursor-pointer'
                : 'bg-(--bg-surface) border-(--border-subtle) cursor-not-allowed opacity-50'
              }
            `}
          >
            <div className={`shrink-0 w-8 h-8 rounded flex items-center justify-center ${tool.iconBg}`}>
              <tool.icon className={`w-4 h-4 ${tool.iconColor}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-(--text-primary)" style={{ fontFamily: 'var(--font-mono)' }}>
                  {tool.name}
                </span>
                {!tool.available && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-(--bg-hover) text-(--text-muted) uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>
                    Soon
                  </span>
                )}
                {tool.available && !hasSelection && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-(--accent-amber-dim) text-(--accent-amber) uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>
                    Select sources
                  </span>
                )}
              </div>
              <p className="text-[11px] text-(--text-muted) mt-0.5 truncate">
                {tool.description}
              </p>
            </div>

            {isActive && (
              <ChevronRight className="shrink-0 w-3.5 h-3.5 text-(--text-muted) group-hover:text-(--accent-cyan) transition-colors" />
            )}
          </button>
        )
      })}
    </div>
  )
}
