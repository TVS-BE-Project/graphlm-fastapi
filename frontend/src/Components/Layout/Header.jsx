import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Check,
  ChevronRight,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  User as UserIcon
} from 'lucide-react'
import { toast } from 'sonner'
import useAuthStore from '@/store/authStore'
import { useThemeStore } from '@/store'
import AvatarUploadModal from '../Common/Modals/AvatarUploadModal'

const getDisplayName = (user) => user?.firstName || user?.username || 'User'
const DEFAULT_AVATAR_URL = 'https://placehold.co/600x400'

function AppHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { theme, resolvedTheme, setTheme } = useThemeStore()

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [themeSubmenuOpen, setThemeSubmenuOpen] = useState(false)
  const menuRootRef = useRef(null)

  const avatarUrl = user?.avatar?.url || DEFAULT_AVATAR_URL
  const displayName = useMemo(() => getDisplayName(user), [user])
  
  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]
  const selectedThemeValue = ['light', 'dark', 'system'].includes(theme) ? theme : 'light'

  useEffect(() => {
    setUserMenuOpen(false)
    setThemeSubmenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRootRef.current && !menuRootRef.current.contains(event.target)) {
        setUserMenuOpen(false)
        setThemeSubmenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Logged out successfully')
      navigate('/auth')
    } catch (error) {
      toast.error('Logout failed')
    }
  }

  const handleThemeChange = (nextTheme) => {
    setTheme(nextTheme)
    setThemeSubmenuOpen(false)
  }

  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  const handleManageAccount = () => {
    setAvatarModalOpen(true)
    setUserMenuOpen(false)
  }

  const handleSettings = () => {
    toast.info('Settings coming soon')
    setUserMenuOpen(false)
  }

  return (
    <header
      className="bg-transparent shrink-0 text-gray-900 dark:text-white transition-colors duration-200"
      ref={menuRootRef}
    >
      <div className="h-16 px-6 flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-white/10 flex items-center justify-center transition-colors">
            <Monitor className="w-5 h-5 text-blue-600 dark:text-gray-200" />
          </div>
          <h1 className="text-xl font-medium tracking-wide text-gray-900 dark:text-white">
            GraphLM
          </h1>
        </button>

        <div className="flex items-center gap-4 relative">
          <button
            onClick={() => {
              setThemeSubmenuOpen(false)
              setUserMenuOpen(!userMenuOpen)
            }}
            className="flex items-center justify-center rounded-full hover:ring-2 hover:ring-blue-400 dark:hover:ring-gray-500 transition-all p-0.5"
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
          >
            <img
              src={avatarUrl}
              alt={displayName}
              onError={(e) => { if (e.currentTarget.src !== DEFAULT_AVATAR_URL) e.currentTarget.src = DEFAULT_AVATAR_URL }}
              className="h-9 w-9 rounded-full object-cover"
            />
          </button>

          {/* Dropdown Menu (Opens Downward) */}
          {userMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-60 rounded-xl shadow-xl border py-1.5 z-50 bg-white dark:bg-[#303134] border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
              
              {/* Email Display */}
              <div className="px-4 py-3 text-sm truncate border-b border-gray-100 dark:border-gray-700">
                {user?.email || 'No email available'}
              </div>

              {/* Settings (Placeholder) */}
              <button
                onClick={handleSettings}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>

              {/* Profile / Manage Account */}
              <button
                onClick={handleManageAccount}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <UserIcon className="w-4 h-4" />
                Profile
              </button>

              {/* Theme Submenu */}
              <div className="relative group">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
                  onMouseEnter={() => setThemeSubmenuOpen(true)}
                  onClick={() => setThemeSubmenuOpen(!themeSubmenuOpen)}
                >
                  <div className="flex items-center gap-3">
                    <Monitor className="w-4 h-4" />
                    Theme
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {themeSubmenuOpen && (
                  <div 
                    className="absolute top-0 right-full mr-1 w-40 rounded-xl shadow-xl border py-1.5 z-50 bg-white dark:bg-[#303134] border-gray-200 dark:border-gray-700"
                    onMouseLeave={() => setThemeSubmenuOpen(false)}
                  >
                    {themeOptions.map((option) => {
                      const Icon = option.icon
                      const isSelected = selectedThemeValue === option.value
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleThemeChange(option.value)}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4" />
                            {option.label}
                          </div>
                          {isSelected && <Check className="w-4 h-4" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="border-t my-1.5 border-gray-100 dark:border-gray-700" />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      <AvatarUploadModal
        open={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        avatarUrl={avatarUrl}
        displayName={displayName}
      />
    </header>
  )
}

export default AppHeader