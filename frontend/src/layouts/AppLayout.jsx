import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '@/Components/Layout/Sidebar'
import AppHeader from '@/Components/Layout/Header'
import AppFooter from '@/Components/Layout/Footer'

function AppLayout() {
  const location = useLocation()
  
  // Show dashboard layout only on exact /dashboard path (header only)
  const isDashboardListView = location.pathname === '/dashboard' || location.pathname === '/dashboard/'

  if (isDashboardListView) {
    return (
      <div className="h-screen flex flex-col bg-(--bg-base) overflow-hidden text-(--text-primary)">
        <AppHeader />
        <main className="flex-1 min-h-0 overflow-auto">
          <Outlet />
        </main>
      </div>
    )
  }

  // Show chat layout for /chat routes (sidebar replaces header)
  return (
    <div className="h-screen flex flex-row bg-(--bg-base) text-(--text-primary) overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
        <AppFooter />
      </main>
    </div>
  )
}

export default AppLayout
