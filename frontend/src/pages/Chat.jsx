import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, PanelLeftOpen, PanelRightOpen, GitBranch } from 'lucide-react'
import { useChatStore } from '@/store'
import sourceService from '@/api/sourceService'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels"
import { toast } from 'sonner'

// Import our new panel components
import SourcesPanel from '@/Components/Chat/SourcesPanel'
import ChatPanel from '@/Components/Chat/ChatPanel'
import StudioPanel from '@/Components/Chat/StudioPanel'
import AddSourceModal from '@/Components/Chat/AddSourceModal'

function Chat() {
  const { id } = useParams()
  const navigate = useNavigate()

  const FileIcon = ({ filename, className }) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <img src="/fileIcons/file-pdf.svg" alt="PDF" className={className} />;
    if (ext === 'doc' || ext === 'docx') return <img src="/fileIcons/file-docx.svg" alt="Word" className={className} />;
    if (ext === 'md' || ext === 'markdown') return <img src="/fileIcons/file-code.svg" alt="Markdown" className={className} />;
    return <img src="/fileIcons/file-text-dark.svg" alt="Text" className={className} />;
  };

  const { sessions, fetchSessions, fetchMessages } = useChatStore()

  // Make sure sessions are loaded
  useEffect(() => {
    if (!sessions.length) {
      fetchSessions()
    }
  }, [sessions.length, fetchSessions])

  useEffect(() => {
    if (id) {
      fetchMessages(id)
    }
  }, [id, fetchMessages])

  const currentSession = useMemo(() => {
    return sessions.find(s => s.id === id)
  }, [sessions, id])

  const [sourceProgress, setSourceProgress] = useState({})

  // ── Selected-sources for Canvas scoping ──────────────────────────────
  // Defaults to all source IDs (all selected) every time a session is opened.
  const [selectedSources, setSelectedSources] = useState([])

  useEffect(() => {
    if (currentSession?.sources) {
      setSelectedSources(currentSession.sources.map(s => s.id))
    }
  }, [currentSession?.id])

  // Panel refs and state
  const [isSourcesOpen, setIsSourcesOpen] = useState(true)
  const [isStudioOpen, setIsStudioOpen] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [activeCanvasTool, setActiveCanvasTool] = useState(null)

  const handleOpenSource = (source) => {
    const meta = source.metadata || source.source_metadata || {};
    const url = meta.repo_url || meta.file_url || meta.cloudinary_url || meta.local_path;

    if (url) {
      // Create an anchor tag to bypass async popup blockers
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      toast.error('No URL available for this source.');
    }
  };

  // Subscribe to SSE for active indexing sources
  useEffect(() => {
    if (!currentSession || !currentSession.sources) return;

    const activeSources = currentSession.sources.filter(s => s.status !== 'indexed' && s.status !== 'failed');
    if (activeSources.length === 0) return;

    const eventSources = [];

    activeSources.forEach(source => {
      const es = sourceService.subscribeToSourceStatus(source.id, {
        onSnapshot: (data) => {
          setSourceProgress(prev => ({
            ...prev,
            [source.id]: {
              vector_indexed: data.vector?.indexed || false,
              graph_indexed: data.graph?.indexed || false
            }
          }));
        },
        onIndexChanged: (data) => {
          setSourceProgress(prev => {
            const prevProgress = prev[source.id] || {};
            const nextVectorIndexed = data.vector_indexed !== undefined ? data.vector_indexed : (prevProgress.vector_indexed || false);
            const nextGraphIndexed = data.graph_indexed !== undefined ? data.graph_indexed : (prevProgress.graph_indexed || false);
            return {
              ...prev,
              [source.id]: {
                vector_indexed: nextVectorIndexed,
                graph_indexed: nextGraphIndexed
              }
            };
          });
        },
        onComplete: () => {
          fetchSessions(); // Refresh session to get updated sources status
        }
      }, source.title);
      eventSources.push(es);
    });

    return () => {
      eventSources.forEach(es => es.close());
    };
  }, [currentSession, fetchSessions]);

  const isVectorIndexing = useMemo(() => {
    if (!currentSession || !currentSession.sources) return false;
    // Chat is disabled if any source is currently indexing and its vector is not yet indexed
    return currentSession.sources.some(s => {
      if (s.status === 'indexed' || s.status === 'failed') return false;
      const progress = sourceProgress[s.id];
      // If we haven't received a snapshot yet, assume it's indexing and block
      if (!progress) return true;
      return !progress.vector_indexed;
    });
  }, [currentSession, sourceProgress]);

  const sessionDate = currentSession?.created_at
    ? new Date(currentSession.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Today'

  return (
    <div className="flex h-full min-h-0 flex-col bg-(--bg-base)">
      {/* Top Header */}
      <div className="border-b border-(--border-subtle) px-4 py-2 flex items-center justify-between bg-(--bg-surface) shrink-0">
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 rounded text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-hover) transition-colors shrink-0"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex flex-col min-w-0">
            <h1 className="text-sm font-semibold text-(--text-primary) leading-tight truncate" style={{ fontFamily: 'var(--font-mono)' }}>
              {currentSession?.title || 'Loading session...'}
            </h1>
            <span className="text-[11px] text-(--text-muted) font-mono">
              {currentSession?.sources?.length || 0} source{currentSession?.sources?.length !== 1 ? 's' : ''} · {sessionDate}
            </span>
          </div>
        </div>

        {/* Right: panel toggles */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsSourcesOpen(v => !v)}
            title={isSourcesOpen ? 'Collapse Sources' : 'Open Sources'}
            className={`p-1.5 rounded transition-colors ${isSourcesOpen ? 'text-(--text-primary) bg-(--bg-hover)' : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-hover)'}`}
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsStudioOpen(v => !v)}
            title={isStudioOpen ? 'Collapse Canvas' : 'Open Canvas'}
            className={`p-1.5 rounded transition-colors ${isStudioOpen ? 'text-(--text-primary) bg-(--bg-hover)' : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-hover)'}`}
          >
            <PanelRightOpen className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex">
        {/* Collapsed Sources Toolbar */}
        {!isSourcesOpen && (
          <div className="w-14 shrink-0 h-full bg-(--bg-surface) border-r border-(--border-subtle) flex flex-col items-center py-3 gap-3">
            <button
              onClick={() => setIsSourcesOpen(true)}
              className="group relative p-2 rounded text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-hover) transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
              <div className="absolute left-full ml-3 px-2 py-1 bg-(--bg-elevated) text-(--text-primary) text-xs rounded border border-(--border-default) opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none" style={{ fontFamily: 'var(--font-mono)' }}>
                Open Sources
              </div>
            </button>
            <div className="flex flex-col gap-2 w-full px-2">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="group relative p-2 rounded bg-(--bg-elevated) text-(--text-muted) hover:text-(--accent-cyan) hover:bg-(--accent-cyan-dim) flex items-center justify-center transition-colors"
              >
                <span className="text-base leading-none">+</span>
                <div className="absolute left-full ml-3 px-2 py-1 bg-(--bg-elevated) text-(--text-primary) text-xs rounded border border-(--border-default) opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none" style={{ fontFamily: 'var(--font-mono)' }}>
                  Add Source
                </div>
              </button>
              {currentSession?.sources?.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleOpenSource(s)}
                  className="group relative w-full aspect-square rounded bg-(--bg-elevated) flex items-center justify-center cursor-pointer hover:bg-(--bg-hover) transition-colors"
                >
                  {s.type === 'github' ? (
                    <GitBranch className="w-4 h-4 text-(--text-muted)" />
                  ) : (
                    <FileIcon filename={s.title} className="w-4 h-4" />
                  )}
                  <div className="absolute left-full ml-3 px-2 py-1 bg-(--bg-elevated) text-(--text-primary) text-xs rounded border border-(--border-default) opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none" style={{ fontFamily: 'var(--font-mono)' }}>
                    {s.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <PanelGroup direction="horizontal">
            {/* Panel 1: Sources */}
            {isSourcesOpen && (
              <>
                <Panel defaultSize="20" minSize="15" maxSize="40">
                  <SourcesPanel
                    currentSession={currentSession}
                    sourceProgress={sourceProgress}
                    onCollapse={() => setIsSourcesOpen(false)}
                    onOpenAddModal={() => setIsAddModalOpen(true)}
                    handleOpenSource={handleOpenSource}
                    selectedSources={selectedSources}
                    onSelectionChange={setSelectedSources}
                    isGraphViewOpen={activeCanvasTool === 'graph'}
                  />
                </Panel>
                <PanelResizeHandle className="w-px bg-(--border-subtle) hover:bg-(--accent-cyan) active:bg-(--accent-cyan) transition-colors cursor-col-resize z-10" />
              </>
            )}

            {/* Panel 2: Chat */}
            <Panel defaultSize="50" minSize="30">
              <ChatPanel
                currentSession={currentSession}
                isVectorIndexing={isVectorIndexing}
                selectedSources={selectedSources}
              />
            </Panel>

            {/* Panel 3: Studio */}
            {isStudioOpen && (
              <>
                <PanelResizeHandle className="w-px bg-(--border-subtle) hover:bg-(--accent-cyan) active:bg-(--accent-cyan) transition-colors cursor-col-resize z-10" />
                <Panel defaultSize="30" minSize="20" maxSize="50">
                  <StudioPanel
                    onCollapse={() => setIsStudioOpen(false)}
                    currentSession={currentSession}
                    selectedSources={selectedSources}
                    onActiveToolChange={setActiveCanvasTool}
                  />
                </Panel>
              </>
            )}
          </PanelGroup>
        </div>

        {/* Collapsed Studio Toolbar */}
        {!isStudioOpen && (
          <div className="w-14 shrink-0 h-full bg-(--bg-surface) border-l border-(--border-subtle) flex flex-col items-center py-3 gap-3">
            <button
              onClick={() => setIsStudioOpen(true)}
              className="group relative p-2 rounded text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-hover) transition-colors"
            >
              <PanelRightOpen className="w-4 h-4" />
              <div className="absolute right-full mr-3 px-2 py-1 bg-(--bg-elevated) text-(--text-primary) text-xs rounded border border-(--border-default) opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none" style={{ fontFamily: 'var(--font-mono)' }}>
                Open Studio
              </div>
            </button>
            <div className="flex flex-col gap-2 w-full px-2">
              <div className="group relative w-full aspect-square rounded bg-(--bg-elevated) flex items-center justify-center text-(--accent-cyan) cursor-pointer hover:bg-(--accent-cyan-dim) transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5" /><path d="M21 3 9 15" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></svg>
                <div className="absolute right-full mr-3 px-2 py-1 bg-(--bg-elevated) text-(--text-primary) text-xs rounded border border-(--border-default) opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none" style={{ fontFamily: 'var(--font-mono)' }}>
                  Graph Tools
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AddSourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        currentSession={currentSession}
      />
    </div>
  )
}

export default Chat
