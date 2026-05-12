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
    <div className="px-8 py-10 max-w-7xl mx-auto h-full font-sans transition-colors duration-200 flex flex-col relative">
      
      {/* Top Filter Bar */}
      <div className="flex items-center justify-between mb-12 h-10">
        {isSearchOpen ? (
          <div className="flex-1 flex items-center gap-3">
             <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#303134] rounded-full border border-gray-300 dark:border-gray-600 focus-within:ring-1 focus-within:ring-blue-500 transition-all shadow-sm dark:shadow-none">
                <Search className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search by chat title"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="bg-transparent border-none outline-none flex-1 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500"
                />
             </div>
             <button 
               onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} 
               className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors px-2"
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
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors flex items-center gap-2"
            >
              <input 
                type="checkbox"
                checked={filteredSessions.length > 0 && selectedChats.length === filteredSessions.length}
                readOnly
                className="rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
              />
              Select All
            </button>
            {selectedChats.length > 0 && (
              <button 
                onClick={() => setModalConfig({ type: 'deleteBulk' })}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete ({selectedChats.length})
              </button>
            )}
            <button 
              onClick={() => {
                setIsSelectionMode(false)
                setSelectedChats([])
              }}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <button 
              onClick={() => setIsSelectionMode(true)}
              className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 dark:bg-[#3c4043] dark:text-white hover:bg-blue-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Select Chats
            </button>
          </div>
        )}

        <div className={`flex items-center gap-3 transition-all ${isSearchOpen ? 'ml-6' : ''}`}>
          {!isSearchOpen && (
            <button onClick={() => setIsSearchOpen(true)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
              <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          )}
          
          <div className="flex bg-gray-100 dark:bg-[#3c4043] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-800 dark:bg-white/20 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'}`}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-800 dark:bg-white/20 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button onClick={handleCreateChat} className="flex items-center gap-2 bg-blue-600 text-white dark:bg-white dark:text-black px-4 py-1.5 rounded-full text-sm font-medium hover:bg-blue-700 dark:hover:bg-gray-200 transition-colors shrink-0">
            <Plus className="w-4 h-4" />
            Create new
          </button>
        </div>
      </div>

      {/* Recent Chats Section */}
      <div className="flex-1 overflow-auto pb-10">
        <h2 className="text-xl text-gray-900 dark:text-gray-200 mb-6">Recent chats</h2>

        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" : "flex flex-col gap-3"}>
          
          {/* Create New Card */}
          <div 
            onClick={handleCreateChat}
            className={`group flex cursor-pointer transition-all ${
              viewMode === 'grid' 
                ? 'flex-col items-center justify-center h-48 bg-gray-50 border-gray-200 dark:bg-[#303134] rounded-2xl border dark:border-transparent hover:border-blue-400 dark:hover:border-gray-500'
                : 'items-center p-4 bg-gray-50 border-gray-200 dark:bg-[#303134] rounded-xl border dark:border-transparent hover:border-blue-400 dark:hover:border-gray-500 gap-4'
            }`}
          >
            <div className={`rounded-full bg-blue-100 dark:bg-[#3c4043] group-hover:bg-blue-200 dark:group-hover:bg-[#4a4d51] flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'w-12 h-12 mb-4' : 'w-10 h-10'}`}>
              <Plus className={`text-blue-600 dark:text-[#a8c7fa] ${viewMode === 'grid' ? 'w-6 h-6' : 'w-5 h-5'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Create new chat</span>
          </div>

          {/* Actual Chats */}
          {isLoadingSessions ? (
            <div className="col-span-full py-12 text-center text-gray-500">Loading chats...</div>
          ) : filteredSessions.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-500">
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
                className={`group relative flex cursor-pointer transition-all ${
                  viewMode === 'grid'
                    ? 'flex-col h-48 bg-white border border-gray-200 hover:border-gray-400 dark:bg-[#303134] rounded-2xl dark:border-transparent dark:hover:border-gray-500 p-5 shadow-sm dark:shadow-none'
                    : 'items-center gap-4 p-4 bg-white border border-gray-200 hover:border-gray-400 dark:bg-[#303134] rounded-xl dark:border-transparent dark:hover:border-gray-500 shadow-sm dark:shadow-none'
                } ${isSelectionMode && selectedChats.includes(chat.id) ? 'border-blue-500 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-blue-500' : ''}`}
              >
                {/* 3-dot Menu Button or Checkbox */}
                <div className={`absolute ${viewMode === 'grid' ? 'top-3 right-3' : 'top-1/2 -translate-y-1/2 right-4'} z-10`}>
                  {isSelectionMode ? (
                    <input
                      type="checkbox"
                      checked={selectedChats.includes(chat.id)}
                      readOnly
                      className="w-5 h-5 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 pointer-events-none"
                    />
                  ) : (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === chat.id ? null : chat.id); }}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>

                      {/* Dropdown Menu */}
                      {openMenuId === chat.id && (
                        <div 
                          ref={menuRef}
                          className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#3c4043] shadow-lg py-1 z-50 overflow-hidden"
                        >
                          <button 
                            onClick={(e) => openRenameModal(e, chat)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" /> Rename
                          </button>
                          <button 
                            onClick={(e) => openDeleteModal(e, chat)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-white/10 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Icon Placeholder */}
                <div className={viewMode === 'grid' ? 'mb-auto' : ''}>
                   <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                     <Grid className="w-4 h-4" />
                   </div>
                </div>

                <div className={viewMode === 'list' ? 'flex-1 flex items-center justify-between pr-10' : ''}>
                  <div className={viewMode === 'list' ? 'flex-1' : ''}>
                    <h3 className={`font-medium text-gray-900 dark:text-white line-clamp-2 ${viewMode === 'grid' ? 'text-base mb-2 pr-6' : 'text-sm'}`}>
                      {chat.title}
                    </h3>
                    {viewMode === 'grid' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        {new Date(chat.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}
                        <span>•</span>
                        {chat.sources?.length || 0} sources
                      </p>
                    )}
                  </div>
                  
                  {viewMode === 'list' && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4 shrink-0">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#303134] border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {modalConfig.type === 'rename' ? 'Rename Chat' : modalConfig.type === 'deleteBulk' ? 'Delete Selected Chats' : 'Delete Chat'}
              </h3>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-6">
              {modalConfig.type === 'rename' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Chat Title
                  </label>
                  <input
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-[#212121] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Enter chat title..."
                  />
                </div>
              ) : modalConfig.type === 'deleteBulk' ? (
                <p className="text-gray-600 dark:text-gray-300">
                  Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">{selectedChats.length} selected chats</span>? This action cannot be undone.
                </p>
              ) : (
                <p className="text-gray-600 dark:text-gray-300">
                  Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">"{modalConfig.session?.title}"</span>? This action cannot be undone.
                </p>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-[#212121] border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
              <button
                onClick={closeModals}
                className="px-4 py-2 rounded-lg font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3c4043] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={modalConfig.type === 'rename' ? confirmRename : modalConfig.type === 'deleteBulk' ? confirmBulkDelete : confirmDelete}
                className={`px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors ${
                  modalConfig.type === 'rename'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
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
