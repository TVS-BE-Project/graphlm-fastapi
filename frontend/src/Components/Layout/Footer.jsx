import useAuthStore from '@/store/authStore'

function AppFooter() {
  const { isAuthenticated } = useAuthStore()

  return (
    <footer className="shrink-0 bg-transparent py-2 border-t border-(--border-subtle)">
      <div className="flex items-center justify-center text-sm text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-mono)' }}>
        {!isAuthenticated ? (
          <span>By messaging GraphLM, you agree to our Terms and have read our Privacy Policy.</span>
        ) : (
          <span>GraphLM can make mistakes. Check important info.</span>
        )}
      </div>
    </footer>
  )
}

export default AppFooter