import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, FileText, GitBranch, ChevronRight, PanelLeftClose, MoreVertical, Trash2 } from 'lucide-react'
import useChatStore from '@/store/chatStore'

function SourcesPanel({ currentSession, sourceProgress, onCollapse, onOpenAddModal, handleOpenSource, selectedSources = [], onSelectionChange, isGraphViewOpen = false }) {
  const [openMenuId, setOpenMenuId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const sources = currentSession?.sources || []
  const { removeSource } = useChatStore()

  const filteredSources = useMemo(() => {
    if (!searchQuery.trim()) return sources;
    const lowerQuery = searchQuery.toLowerCase();
    return sources.filter(source =>
      source.title?.toLowerCase().includes(lowerQuery)
    );
  }, [sources, searchQuery]);

  const FileIcon = ({ filename, className }) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <img src="/fileIcons/file-pdf.svg" alt="PDF" className={className} />;
    if (ext === 'doc' || ext === 'docx') return <img src="/fileIcons/file-docx.svg" alt="Word" className={className} />;
    if (ext === 'md' || ext === 'markdown') return <img src="/fileIcons/file-code.svg" alt="Markdown" className={className} />;
    return <img src="/fileIcons/file-text-dark.svg" alt="Text" className={className} />;
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  const handleRemove = async (e, sourceId) => {
    e.stopPropagation();
    if (currentSession) {
      await removeSource(currentSession.id, sourceId);
      // Remove from selected list if deleted
      setSelectedSources(prev => prev.filter(id => id !== sourceId));
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const newSelections = new Set([...selectedSources, ...filteredSources.map(s => s.id)])
      onSelectionChange(Array.from(newSelections))
    } else {
      const filteredIds = new Set(filteredSources.map(s => s.id))
      onSelectionChange(selectedSources.filter(id => !filteredIds.has(id)))
    }
  }

  const handleSelect = (sourceId) => {
    onSelectionChange(
      selectedSources.includes(sourceId)
        ? selectedSources.filter(id => id !== sourceId)
        : [...selectedSources, sourceId]
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] text-[var(--text-primary)] border-r border-[var(--border-subtle)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <h2 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>Sources</h2>
        <button
          onClick={onCollapse}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
          title="Close Sources"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 py-2">
        <button
          onClick={onOpenAddModal}
          className="w-full py-1.5 flex items-center justify-center gap-2 border border-dashed border-[var(--border-default)] rounded text-xs font-medium hover:border-[var(--accent-cyan)] hover:bg-[var(--accent-cyan-dim)] hover:text-[var(--accent-cyan)] transition-colors text-[var(--text-muted)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <Plus className="w-3.5 h-3.5" /> Add source
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sources"
            className="w-full bg-[var(--bg-elevated)] border border-transparent focus:border-[var(--accent-cyan)] rounded pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 mt-1 space-y-0.5">
        {/* Select All Header */}
        {filteredSources.length > 0 && (
          <div
            className="flex items-center justify-end px-2 py-2 mb-1 border-b border-[var(--border-subtle)] gap-3"
            title={isGraphViewOpen ? 'Close Graph View to change source selection' : ''}
          >
            <span className={`text-[10px] uppercase tracking-wider ${isGraphViewOpen ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`} style={{ fontFamily: 'var(--font-mono)' }}>Select all</span>
            <input
              type="checkbox"
              checked={filteredSources.length > 0 && filteredSources.every(s => selectedSources.includes(s.id))}
              onChange={handleSelectAll}
              disabled={isGraphViewOpen}
              className={`rounded border-[var(--border-default)] bg-[var(--bg-elevated)] accent-[var(--accent-cyan)] w-3.5 h-3.5 ml-1 ${isGraphViewOpen ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            />
          </div>
        )}

        {filteredSources.map(source => {
          const isGithub = source.type === 'github'
          const progress = sourceProgress[source.id];
          const isIndexing = source.status !== 'indexed' && source.status !== 'failed';
          const isVectorIndexing = isIndexing && (progress ? !progress.vector_indexed : true);
          const isGraphIndexing = isIndexing && (progress ? !progress.graph_indexed : true);
          const showBlink = isVectorIndexing;

          return (
            <div key={source.id} className={`flex items-center justify-between p-2 rounded hover:bg-[var(--bg-elevated)] group cursor-pointer transition-colors ${showBlink ? 'animate-pulse' : ''}`}>
              <div
                onClick={() => handleOpenSource && handleOpenSource(source)}
                className="flex items-center gap-2.5 overflow-hidden flex-1"
              >
                {isGithub ? (
                  <GitBranch className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                ) : (
                  <FileIcon filename={source.title} className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="text-xs truncate text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-mono)' }}>{source.title}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isVectorIndexing && source.status !== 'failed' && (
                  <span className="text-[10px] text-[var(--accent-amber)] font-medium px-1.5 py-0.5 rounded bg-[var(--accent-amber-dim)]" style={{ fontFamily: 'var(--font-mono)' }}>Vector...</span>
                )}
                {!isVectorIndexing && isGraphIndexing && source.status !== 'failed' && (
                  <span className="text-[10px] text-[var(--text-secondary)] font-medium px-1.5 py-0.5 rounded bg-[var(--bg-elevated)]" style={{ fontFamily: 'var(--font-mono)' }}>Graph...</span>
                )}

                {/* 3-Dot Menu */}
                <div className={`relative transition-opacity ${openMenuId === source.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === source.id ? null : source.id)}
                    className={`p-1 rounded hover:bg-[var(--bg-hover)] transition-colors ${openMenuId === source.id ? 'text-[var(--text-primary)] bg-[var(--bg-hover)]' : 'text-[var(--text-muted)]'}`}
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                  {openMenuId === source.id && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded shadow-xl z-50">
                      <button
                        onClick={(e) => {
                          handleRemove(e, source.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--accent-red)] hover:bg-[var(--accent-red-dim)] rounded transition-colors text-left"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  )}
                </div>

                <input
                  type="checkbox"
                  checked={selectedSources.includes(source.id)}
                  onChange={() => handleSelect(source.id)}
                  disabled={isGraphViewOpen}
                  title={isGraphViewOpen ? 'Close Graph View to change source selection' : ''}
                  className={`rounded border-[var(--border-default)] bg-[var(--bg-elevated)] accent-[var(--accent-cyan)] w-3.5 h-3.5 ml-1 ${isGraphViewOpen ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )
        })}
        {filteredSources.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
            {searchQuery.trim() ? "No sources match your search." : "No sources attached yet."}
          </div>
        )}
      </div>
    </div>
  )
}

export default SourcesPanel
