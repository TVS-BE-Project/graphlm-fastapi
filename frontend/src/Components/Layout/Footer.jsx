import useAuthStore from '@/store/authStore'

function AppFooter() {
  const { isAuthenticated } = useAuthStore()

  return (
    <footer className="shrink-0 bg-transparent py-2">
      <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
        {!isAuthenticated ? (
          <span>By messaging GraphLM, an AI chatbot, you agree to our Terms and have read our Privacy Policy.</span>
        ) : (
          <span>GraphLM can make mistakes. Check important info.</span>
        )}
      </div>
    </footer>
  )
}

export default AppFooter