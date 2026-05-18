import { useState, useRef, useEffect, memo, useMemo } from 'react'
import { ArrowUp, Loader2, MoreVertical, Pencil, X } from 'lucide-react'
import { useChatStore } from '@/store'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseContent } from '../../utils/parseContent'
import { CodeBlock } from './Renderers/CodeBlock'
import { TableRenderer, TableHead, TableBody, TableRow, TableHeader, TableCell } from './Renderers/TableRenderer'
import { CitationBadge } from './Renderers/CitationBadge'

const MARKDOWN_COMPONENTS = {
  code: CodeBlock,
  table: TableRenderer,
  thead: TableHead,
  tbody: TableBody,
  tr: TableRow,
  th: TableHeader,
  td: TableCell,
}

function renderParsedContent(content) {
  const blocks = parseContent(content)
  return blocks.map((block, i) => {
    if (block.type === 'citation') {
      return <CitationBadge key={i} source={block.source} page={block.page} />
    }
    return (
      <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
        {block.value}
      </ReactMarkdown>
    )
  })
}

// Memoised bubble — only re-renders when its own message object reference changes.
// During streaming only the one streaming message updates; all completed ones stay frozen.
const MessageBubble = memo(function MessageBubble({ msg }) {
  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] lg:max-w-2xl px-5 py-3 rounded-xl ${
          msg.role === 'user'
            ? 'bg-(--accent-cyan) text-(--text-inverse) rounded-tr-sm'
            : 'bg-(--bg-elevated) text-(--text-primary) border border-(--border-subtle) rounded-tl-sm'
        } ${msg.status === 'error' ? 'border-(--accent-red) border' : ''}`}
      >
        {msg.status === 'streaming' && !msg.content ? (
          <div className="flex items-center gap-3 text-(--text-muted)">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm italic" style={{ fontFamily: 'var(--font-mono)' }}>
              {msg.metadata?.phase
                ? msg.metadata.phase
                    .split('_')
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                    .join(' ') + '...'
                : 'Thinking...'}
            </span>
          </div>
        ) : (
          <div className={`text-sm leading-relaxed prose prose-invert prose-p:my-1 prose-pre:bg-transparent max-w-none ${msg.role === 'user' ? 'prose-p:text-(--text-inverse)' : ''}`}>
            {msg.role === 'user' ? (
              <p className="m-0" style={{ fontFamily: 'var(--font-sans)' }}>{msg.content}</p>
            ) : (
              renderParsedContent(msg.content)
            )}
          </div>
        )}
      </div>
    </div>
  )
})

function ChatPanel({ currentSession, isVectorIndexing, selectedSources = [] }) {
  const [input, setInput] = useState('')
  const { messages, sendMessage, stopStreaming, isStreaming, isLoadingMessages, isFetchingMore, hasMoreMessages, loadMoreMessages } = useChatStore()
  const { fetchSessions } = useChatStore()
  const messagesEndRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const previousScrollHeight = useRef(0)
  const isFetchingRef = useRef(false)

  // 3-dot menu state
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Rename dialog state
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)
  const renameInputRef = useRef(null)

  const isAtBottom = useRef(true)

  // Close 3-dot menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Focus rename input when dialog opens
  useEffect(() => {
    if (isRenaming) {
      setRenameValue(currentSession?.title || '')
      setTimeout(() => renameInputRef.current?.select(), 50)
    }
  }, [isRenaming])

  const handleOpenRename = () => {
    setMenuOpen(false)
    setIsRenaming(true)
  }

  const handleRename = async (e) => {
    e.preventDefault()
    const trimmed = renameValue.trim()
    if (!trimmed || !currentSession) return
    setRenameLoading(true)
    try {
      const { chatSessionService } = await import('@/api/chatSessionService')
      await chatSessionService.renameSession(currentSession.id, trimmed)
      await fetchSessions()
    } catch (err) {
      console.error('Rename failed:', err)
    } finally {
      setRenameLoading(false)
      setIsRenaming(false)
    }
  }

  // Pin the scroll to the bottom during streaming — instant, no animation fighting
  const pinToBottom = () => {
    const el = scrollContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  // Smooth scroll only for the initial jump when user sends a message
  const smoothScrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isFetchingRef.current && scrollContainerRef.current) {
      // Preserve scroll position when prepending old messages
      const newScrollHeight = scrollContainerRef.current.scrollHeight;
      scrollContainerRef.current.scrollTop = newScrollHeight - previousScrollHeight.current;
      isFetchingRef.current = false;
    } else if (!isFetchingMore && !isFetchingRef.current && isAtBottom.current) {
      // Only auto-scroll if user is already near the bottom.
      // Use instant scroll during streaming to avoid competing animations.
      pinToBottom()
    }
  }, [messages])

  const handleScroll = (e) => {
    const el = e.target
    // Track if user is near the bottom (within 80px threshold)
    isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80

    if (el.scrollTop === 0 && hasMoreMessages && !isFetchingMore && currentSession) {
      previousScrollHeight.current = el.scrollHeight;
      isFetchingRef.current = true;
      loadMoreMessages(currentSession.id);
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || isVectorIndexing || isStreaming || !currentSession) return

    const content = input
    setInput('')
    isAtBottom.current = true // ensure we scroll to new message
    await sendMessage(currentSession.id, content, selectedSources)
  }


  return (
    <div className="flex h-full flex-col bg-(--bg-base) relative">

      {/* Chat panel header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-(--border-subtle) bg-(--bg-surface) shrink-0">
        <span className="text-xs font-medium text-(--text-muted) flex items-center gap-2 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Chat
        </span>

        {/* 3-dot menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-1 rounded text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-hover) transition-colors"
            title="Chat options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-(--bg-elevated) border border-(--border-strong) rounded shadow-xl z-50 py-1 overflow-hidden">
              <button
                onClick={handleOpenRename}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-(--text-secondary) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <Pencil className="w-3.5 h-3.5 text-(--text-muted)" />
                Rename
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rename dialog */}
      {isRenaming && (
        <div className="absolute inset-0 z-50 flex items-start justify-center pt-24 px-6">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsRenaming(false)} />
          <form
            onSubmit={handleRename}
            className="relative w-full max-w-sm bg-(--bg-elevated) rounded border border-(--border-strong) shadow-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-(--text-primary) uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>Rename chat</h3>
              <button type="button" onClick={() => setIsRenaming(false)} className="text-(--text-muted) hover:text-(--text-primary) transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              maxLength={100}
              placeholder="Chat name"
              className="field-input mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRenaming(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!renameValue.trim() || renameLoading}
                className="btn-primary"
              >
                {renameLoading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Scrollable messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 pt-6 pb-24"
      >
        <div className="max-w-3xl mx-auto space-y-6">
          {hasMoreMessages && !isFetchingMore && (
            <div className="flex justify-center py-2">
              <button
                onClick={() => {
                  isFetchingRef.current = true;
                  loadMoreMessages(currentSession.id);
                }}
                className="text-xs font-medium px-4 py-1.5 rounded border border-(--border-default) text-(--text-secondary) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Load previous messages
              </button>
            </div>
          )}
          {isFetchingMore && (
            <div className="flex justify-center items-center py-4 text-(--text-muted)">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-xs" style={{ fontFamily: 'var(--font-mono)' }}>Loading older messages...</span>
            </div>
          )}
          {isLoadingMessages ? (
            <div className="flex justify-center items-center py-10 text-(--text-muted)">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-xs" style={{ fontFamily: 'var(--font-mono)' }}>Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-center">
               <div className="w-14 h-14 bg-(--accent-cyan-dim) rounded flex items-center justify-center mb-5">
                 <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-(--accent-cyan)"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
               </div>
               <h3 className="text-base font-semibold text-(--text-primary) mb-2" style={{ fontFamily: 'var(--font-mono)' }}>How can I help you today?</h3>
               <p className="text-sm text-(--text-secondary) max-w-md">Ask questions about your documents and the knowledge graph will provide accurate, grounded answers.</p>
             </div>
          ) : (
            <>
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 pb-5 bg-gradient-to-t from-(--bg-base) to-transparent pointer-events-none">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative pointer-events-auto">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isVectorIndexing || isStreaming}
            placeholder={isVectorIndexing ? "Indexing documents (please wait)..." : isStreaming ? "Assistant is responding..." : "Message GraphLM..."}
            className={`w-full px-4 py-2.5 pr-12 border border-(--border-default) rounded-full bg-(--bg-elevated) text-(--text-primary) focus:outline-none focus:border-(--accent-cyan) focus:shadow-[0_0_0_2px_var(--accent-cyan-dim)] transition-all placeholder:text-(--text-muted) ${isVectorIndexing || isStreaming ? 'opacity-60 cursor-not-allowed' : ''}`}
            style={{ fontFamily: 'var(--font-sans)', fontSize: '14px' }}
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={stopStreaming}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-(--accent-red) text-white hover:opacity-80 transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"/></svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || isVectorIndexing}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-(--accent-cyan) text-(--text-inverse) hover:bg-[#00b588] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

export default ChatPanel
