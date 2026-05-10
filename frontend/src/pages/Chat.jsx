import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowUp } from 'lucide-react'
import { useChatStore } from '@/store'

function Chat() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const { sessions, fetchSessions } = useChatStore()

  // Make sure sessions are loaded
  useEffect(() => {
    if (!sessions.length) {
      fetchSessions()
    }
  }, [sessions.length, fetchSessions])

  const currentSession = useMemo(() => {
    return sessions.find(s => s.id === id)
  }, [sessions, id])

  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'Hello! How can I help you with your knowledge graph?',
      sender: 'assistant',
      timestamp: '10:30 AM',
    },
  ])
  const [input, setInput] = useState('')

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const newMessage = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    }

    setMessages(prev => [...prev, newMessage])
    setInput('')

    // Simulate assistant response
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: 'This is a placeholder response. The real assistant will respond here.',
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
        },
      ])
    }, 500)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      {/* Page Header */}
      <div className="border-b border-gray-200 dark:border-gray-800/60 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-medium text-gray-900 dark:text-gray-200">
          {currentSession ? currentSession.title : 'Loading session...'}
        </h1>
      </div>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto max-w-3xl mx-auto w-full px-4 py-8">
        <div className="space-y-8">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] lg:max-w-2xl px-5 py-3 ${
                  msg.sender === 'user'
                    ? 'bg-gray-100 dark:bg-[#303134] text-gray-900 dark:text-gray-100 rounded-2xl rounded-tr-sm'
                    : 'bg-transparent text-gray-900 dark:text-gray-100'
                }`}
              >
                <p className="text-base leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-4 pt-0">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Message GraphLM..."
            className="w-full px-4 py-3.5 pr-14 border border-gray-200 dark:border-gray-700/50 rounded-2xl bg-white dark:bg-[#303134] text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-500 transition-all placeholder:text-gray-500 dark:placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-xl bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-gray-900 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 dark:disabled:bg-gray-600 dark:disabled:text-gray-400 transition-colors"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </form>
      </footer>
    </div>
  )
}

export default Chat

