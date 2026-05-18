import { useState } from 'react'
import { LayoutTemplate, ChevronRight, PanelRightClose } from 'lucide-react'
import { useChatStore } from '@/store'
import { CanvasHome } from './Canvas/CanvasHome'
import { GraphView } from './Canvas/GraphView'
import { DocsView } from './Canvas/DocsView'

const TOOL_LABELS = {
  graph: 'Graph View',
  docs: 'Docs',
}

function CanvasPanel({ onCollapse, currentSession, selectedSources = [], onActiveToolChange }) {
  const [activeTool, setActiveTool] = useState(null) // null = home
  const { graphData, subgraphMode, setSubgraphMode } = useChatStore()

  // Disable sync mode whenever the user leaves Graph View
  const handleBack = () => {
    if (activeTool === 'graph') setSubgraphMode(false)
    setActiveTool(null)
    onActiveToolChange?.(null)
  }

  const handleSelectTool = (toolId) => {
    if (activeTool === 'graph' && toolId !== 'graph') setSubgraphMode(false)
    setActiveTool(toolId)
    onActiveToolChange?.(toolId)
  }

  const handleCollapse = () => {
    setSubgraphMode(false)
    setActiveTool(null)
    onActiveToolChange?.(null)
    onCollapse()
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] text-[var(--text-primary)] border-l border-[var(--border-subtle)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] shrink-0">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs font-medium min-w-0" style={{ fontFamily: 'var(--font-mono)' }}>
          <button
            onClick={handleBack}
            className={`flex items-center gap-1.5 transition-colors uppercase tracking-widest ${
              activeTool
                ? 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] cursor-default'
            }`}
          >
            <LayoutTemplate className="w-3.5 h-3.5 shrink-0" />
            <span>Canvas</span>
          </button>

          {activeTool && (
            <>
              <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
              <span className="text-[var(--text-secondary)] truncate uppercase tracking-widest">
                {TOOL_LABELS[activeTool]}
              </span>
            </>
          )}
        </nav>

        <button
          onClick={handleCollapse}
          className="shrink-0 ml-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
          title="Close Canvas"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTool === null && (
          <CanvasHome onSelectTool={handleSelectTool} selectedSources={selectedSources} />
        )}
        {activeTool === 'graph' && (
          <GraphView
            currentSession={currentSession}
            graphData={graphData}
            syncMode={subgraphMode}
            onSetSyncMode={setSubgraphMode}
            selectedSources={selectedSources}
          />
        )}
        {activeTool === 'docs' && (
          <DocsView />
        )}
      </div>
    </div>
  )
}

export default CanvasPanel
