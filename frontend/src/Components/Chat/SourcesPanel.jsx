import { useState } from 'react'
import { Plus, Search, FileText, GitBranch, ChevronRight, PanelLeftClose } from 'lucide-react'

function SourcesPanel({ currentSession, sourceProgress, onCollapse }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const sources = currentSession?.sources || []

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-200 border-r border-gray-800">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold">Sources</h2>
        <button 
          onClick={onCollapse}
          className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-[#2a2a2a] transition-colors"
          title="Close Sources"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 pb-3">
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="w-full py-2 flex items-center justify-center gap-2 border border-gray-700 rounded-full text-sm font-medium hover:bg-[#2a2a2a] transition-colors"
        >
          <Plus className="w-4 h-4" /> Add source
        </button>
      </div>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search for sources" 
            className="w-full bg-[#2a2a2a] border border-transparent focus:border-gray-600 rounded-lg pl-9 pr-4 py-1.5 text-sm outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 mt-2 space-y-1">
        {sources.map(source => {
          const isGithub = source.type === 'github'
          const progress = sourceProgress[source.id]
          const isIndexing = source.status !== 'indexed' && source.status !== 'failed'

          return (
            <div key={source.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#2a2a2a] group cursor-pointer">
              <div className="flex items-center gap-3 overflow-hidden">
                {isGithub ? (
                  <GitBranch className="w-4 h-4 text-gray-400 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span className="text-sm truncate">{source.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {isIndexing && (
                  <span className="text-[10px] text-blue-400">Indexing...</span>
                )}
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 text-gray-500" />
              </div>
            </div>
          )
        })}
        {sources.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No sources attached yet.
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#212121] border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Add a new source</h3>
            <p className="text-sm text-gray-400 mb-6">Select an existing source or upload a new one.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm text-gray-300 hover:text-white">Cancel</button>
              <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm bg-white text-black font-medium rounded-lg">Coming Soon</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SourcesPanel
