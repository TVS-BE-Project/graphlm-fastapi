import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '@/store'
import { Search, Grid, List, Plus, MoreHorizontal, Edit2, Trash2, X } from 'lucide-react'

function Dashboard() {
  const navigate = useNavigate()
  const { sessions, fetchSessions, createSession, deleteSession, renameSession, isLoadingSessions } = useChatStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedChats, setSelectedChats] = useState([])

  const [openMenuId, setOpenMenuId] = useState(null)
  const [modalConfig, setModalConfig] = useState({ type: null, session: null })
  const [renameInput, setRenameInput] = useState('')

  const menuRef = useRef(null)

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Handle clicking outside the 3-dot menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

  const handleCreateChat = async () => {
    try {
      const newSession = await createSession({ title: 'New Chat' })
      navigate(`/chat/${newSession.id}`)
    } catch (err) {
      console.error(err)
    }
  }

  const handleOpenChat = (id) => {
    navigate(`/chat/${id}`)
  }

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value)
  }, [])

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions
    const lowerQuery = searchQuery.toLowerCase()
    return sessions.filter(session =>
      session.title?.toLowerCase().includes(lowerQuery)
    )
  }, [sessions, searchQuery])

  const openRenameModal = (e, session) => {
    e.stopPropagation()
    setRenameInput(session.title || '')
    setModalConfig({ type: 'rename', session })
    setOpenMenuId(null)
  }

  const openDeleteModal = (e, session) => {
    e.stopPropagation()
    setModalConfig({ type: 'delete', session })
    setOpenMenuId(null)
  }

  const closeModals = () => {
    setModalConfig({ type: null, session: null })
  }

  const confirmRename = async () => {
    if (modalConfig.session && renameInput.trim()) {
      await renameSession(modalConfig.session.id, renameInput.trim())
    }
    closeModals()
  }

  const confirmDelete = async () => {
    if (modalConfig.session) {
      await deleteSession(modalConfig.session.id)
    }
    closeModals()
  }

  const confirmBulkDelete = async () => {
    // Delete all selected chats
    for (const id of selectedChats) {
      await deleteSession(id)
    }
    setIsSelectionMode(false)
    setSelectedChats([])
    closeModals()
  }

  const toggleSelectChat = (id) => {
    setSelectedChats(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id])
  }

  return (
    <div className="px-8 py-10 max-w-7xl mx-auto h-full flex flex-col relative">

      {/* Top Filter Bar */}
      <div className="flex items-center justify-between mb-12 h-10">
        {isSearchOpen ? (
          <div className="flex-1 flex items-center gap-3">
             <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-(--bg-elevated) rounded border border-(--border-default) focus-within:border-(--accent-cyan) focus-within:shadow-[0_0_0_2px_var(--accent-cyan-dim)] transition-all">
                <Search className="w-4 h-4 text-(--text-muted) shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search by chat title"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="bg-transparent border-none outline-none flex-1 text-sm text-(--text-primary) placeholder:text-(--text-muted)"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
             </div>
             <button
               onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
               className="text-xs font-medium text-(--text-secondary) hover:text-(--text-primary) transition-colors px-2"
               style={{ fontFamily: 'var(--font-mono)' }}
             >
               Cancel
             </button>
          </div>
        ) : isSelectionMode ? (
          <div className="flex items-center gap-4 text-sm animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                if (selectedChats.length === filteredSessions.length && filteredSessions.length > 0) {
                  setSelectedChats([])
                } else {
                  setSelectedChats(filteredSessions.map(s => s.id))
                }
              }}
              className="text-(--text-secondary) hover:text-(--text-primary) transition-colors flex items-center gap-2"
            >
              <input
                type="checkbox"
                checked={filteredSessions.length > 0 && selectedChats.length === filteredSessions.length}
                readOnly
                className="rounded border-(--border-default) bg-(--bg-elevated) text-(--accent-cyan) cursor-pointer w-4 h-4 accent-(--accent-cyan)"
              />
              Select All
            </button>
            {selectedChats.length > 0 && (
              <button
                onClick={() => setModalConfig({ type: 'deleteBulk' })}
                className="text-(--accent-red) hover:opacity-80 transition-opacity flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete ({selectedChats.length})
              </button>
            )}
            <button
              onClick={() => {
                setIsSelectionMode(false)
                setSelectedChats([])
              }}
              className="text-(--text-secondary) hover:text-(--text-primary) transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => setIsSelectionMode(true)}
              className="px-4 py-1.5 rounded border border-(--border-default) text-(--text-secondary) hover:border-(--border-strong) hover:text-(--text-primary) transition-colors"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >
              Select Chats
            </button>
          </div>
        )}

        <div className={`flex items-center gap-3 transition-all ${isSearchOpen ? 'ml-6' : ''}`}>
          {!isSearchOpen && (
            <button onClick={() => setIsSearchOpen(true)} className="p-2 rounded hover:bg-(--bg-hover) transition-colors">
              <Search className="w-4 h-4 text-(--text-secondary)" />
            </button>
          )}

          <div className="flex bg-(--bg-elevated) rounded overflow-hidden border border-(--border-default)">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-(--bg-hover) text-(--text-primary)' : 'text-(--text-muted) hover:text-(--text-secondary)'}`}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-(--bg-hover) text-(--text-primary)' : 'text-(--text-muted) hover:text-(--text-secondary)'}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button onClick={handleCreateChat} className="btn-primary flex items-center gap-2 px-4 py-1.5 h-auto text-xs shrink-0">
            <Plus className="w-4 h-4" />
            Create new
          </button>
        </div>
      </div>

      {/* Recent Chats Section */}
      <div className="flex-1 overflow-auto pb-10">
        <h2 className="text-sm font-medium text-(--text-muted) mb-6 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>Recent chats</h2>

        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" : "flex flex-col gap-2"}>

          {/* Create New Card */}
          <div
            onClick={handleCreateChat}
            className={`group flex cursor-pointer transition-all border border-dashed border-(--border-default) hover:border-(--accent-cyan) hover:bg-(--accent-cyan-dim) rounded ${
              viewMode === 'grid'
                ? 'flex-col items-center justify-center h-44'
                : 'items-center p-4 gap-4'
            }`}
          >
            <div className={`rounded bg-(--bg-elevated) group-hover:bg-(--accent-cyan-dim) flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'w-10 h-10 mb-3' : 'w-8 h-8'}`}>
              <Plus className={`text-(--text-muted) group-hover:text-(--accent-cyan) transition-colors ${viewMode === 'grid' ? 'w-5 h-5' : 'w-4 h-4'}`} />
            </div>
            <span className="text-xs font-medium text-(--text-muted) group-hover:text-(--accent-cyan) transition-colors" style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Create new chat</span>
          </div>

          {/* Actual Chats */}
          {isLoadingSessions ? (
            <div className="col-span-full py-12 text-center text-(--text-muted) text-sm" style={{ fontFamily: 'var(--font-mono)' }}>Loading chats...</div>
          ) : filteredSessions.length === 0 ? (
            <div className="col-span-full py-12 text-center text-(--text-muted) text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
              No chats found {searchQuery && 'matching your search'}
            </div>
          ) : (
            filteredSessions.map(chat => (
              <div
                key={chat.id}
                onClick={() => {
                  if (isSelectionMode) {
                    toggleSelectChat(chat.id)
                  } else {
                    handleOpenChat(chat.id)
                  }
                }}
                className={`group relative flex cursor-pointer transition-all border rounded ${
                  viewMode === 'grid'
                    ? 'flex-col h-44 p-4'
                    : 'items-center gap-4 p-3'
                } ${isSelectionMode && selectedChats.includes(chat.id)
                    ? 'border-(--accent-cyan) bg-(--accent-cyan-dim)'
                    : 'border-(--border-subtle) bg-(--bg-surface) hover:border-(--border-default) hover:bg-(--bg-elevated)'
                }`}
              >
                {/* 3-dot Menu Button or Checkbox */}
                <div className={`absolute ${viewMode === 'grid' ? 'top-3 right-3' : 'top-1/2 -translate-y-1/2 right-3'} z-10`}>
                  {isSelectionMode ? (
                    <input
                      type="checkbox"
                      checked={selectedChats.includes(chat.id)}
                      readOnly
                      className="w-4 h-4 rounded border-(--border-default) pointer-events-none accent-(--accent-cyan)"
                    />
                  ) : (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === chat.id ? null : chat.id); }}
                        className="p-1 rounded hover:bg-(--bg-hover) text-(--text-muted) hover:text-(--text-primary) transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {openMenuId === chat.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-full mt-1 w-40 rounded border border-(--border-strong) bg-(--bg-elevated) shadow-xl py-1 z-50 overflow-hidden"
                        >
                          <button
                            onClick={(e) => openRenameModal(e, chat)}
                            className="w-full text-left px-3 py-2 text-xs text-(--text-secondary) hover:bg-(--bg-hover) hover:text-(--text-primary) flex items-center gap-2 transition-colors"
                            style={{ fontFamily: 'var(--font-mono)' }}
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Rename
                          </button>
                          <button
                            onClick={(e) => openDeleteModal(e, chat)}
                            className="w-full text-left px-3 py-2 text-xs text-(--accent-red) hover:bg-(--accent-red-dim) flex items-center gap-2 transition-colors"
                            style={{ fontFamily: 'var(--font-mono)' }}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Icon Placeholder */}
                <div className={viewMode === 'grid' ? 'mb-auto' : ''}>
                   <div className="w-7 h-7 rounded bg-(--accent-cyan-dim) flex items-center justify-center text-(--accent-cyan)">
                     <Grid className="w-3.5 h-3.5" />
                   </div>
                </div>

                <div className={viewMode === 'list' ? 'flex-1 flex items-center justify-between pr-10' : ''}>
                  <div className={viewMode === 'list' ? 'flex-1' : ''}>
                    <h3 className={`font-medium text-(--text-primary) line-clamp-2 ${viewMode === 'grid' ? 'text-sm mb-2 pr-6' : 'text-sm'}`}>
                      {chat.title}
                    </h3>
                    {viewMode === 'grid' && (
                      <p className="text-xs text-(--text-muted) flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
                        {new Date(chat.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}
                        <span>·</span>
                        {chat.sources?.length || 0} sources
                      </p>
                    )}
                  </div>

                  {viewMode === 'list' && (
                    <div className="text-xs text-(--text-muted) flex items-center gap-4 shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>
                      <span>{chat.sources?.length || 0} sources</span>
                      <span>{new Date(chat.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Rename / Delete Modals */}
      {modalConfig.type && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-subtle)">
              <h3 className="text-sm font-semibold text-(--text-primary)" style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {modalConfig.type === 'rename' ? 'Rename Chat' : modalConfig.type === 'deleteBulk' ? 'Delete Selected Chats' : 'Delete Chat'}
              </h3>
              <button onClick={closeModals} className="text-(--text-muted) hover:text-(--text-primary) transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              {modalConfig.type === 'rename' ? (
                <div>
                  <label className="field-label">Chat Title</label>
                  <input
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
                    className="field-input"
                    placeholder="Enter chat title..."
                  />
                </div>
              ) : modalConfig.type === 'deleteBulk' ? (
                <p className="text-(--text-secondary) text-sm">
                  Are you sure you want to delete <span className="font-semibold text-(--text-primary)">{selectedChats.length} selected chats</span>? This action cannot be undone.
                </p>
              ) : (
                <p className="text-(--text-secondary) text-sm">
                  Are you sure you want to delete <span className="font-semibold text-(--text-primary)">"{modalConfig.session?.title}"</span>? This action cannot be undone.
                </p>
              )}
            </div>

            <div className="px-6 py-4 bg-(--bg-surface) border-t border-(--border-subtle) flex justify-end gap-3">
              <button
                onClick={closeModals}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={modalConfig.type === 'rename' ? confirmRename : modalConfig.type === 'deleteBulk' ? confirmBulkDelete : confirmDelete}
                className={modalConfig.type === 'rename' ? 'btn-primary' : 'btn-danger'}
              >
                {modalConfig.type === 'rename' ? 'Save' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Dashboard
