import { useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'
import userService from '@/api/userService'
import useAuthStore from '@/store/authStore'

export default function AvatarUploadModal({ open, onClose, avatarUrl, displayName }) {
  const { user, setUser } = useAuthStore()
  
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  
  const [fullname, setFullname] = useState(user?.fullname || user?.firstName || '')
  const [username, setUsername] = useState(user?.username || '')
  
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (open && user) {
      setFullname(user.fullname || user.firstName || '')
      setUsername(user.username || '')
    }
    if (!open) {
      setSelectedFile(null)
      setPreviewUrl(null)
      setSaving(false)
    }
  }, [open, user])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleSelectFile = (file) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setSelectedFile(file)
    setPreviewUrl(url)
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0]
    handleSelectFile(file)
  }

  const handleSave = async () => {
    setSaving(true)
    let updatedUser = { ...user }

    try {
      // Handle Avatar Upload
      if (selectedFile) {
        const avatarRes = await userService.uploadAvatar(selectedFile)
        updatedUser.avatar = avatarRes?.data ?? avatarRes
      }

      // Handle Profile Details Update
      const isNameChanged = fullname !== (user.fullname || user.firstName || '')
      const isUsernameChanged = username !== (user.username || '')
      
      if (isNameChanged || isUsernameChanged) {
        const updatePayload = {}
        if (isNameChanged) updatePayload.fullname = fullname
        if (isUsernameChanged) updatePayload.username = username
        
        const profileRes = await userService.updateProfile(updatePayload)
        const updatedProfile = profileRes?.data ?? profileRes
        updatedUser = { ...updatedUser, ...updatedProfile }
      }

      useAuthStore.setState({ user: updatedUser })
      toast.success('Profile updated successfully')
      onClose()
    } catch (err) {
      console.error(err)
      toast.error(err?.response?.data?.message || 'Profile update failed')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#212121] p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit profile</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center gap-6">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700 relative">
              {previewUrl ? (
                <img src={previewUrl} alt="preview" className="h-full w-full object-cover" />
              ) : (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-colors">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          <div className="w-full space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Display name
              </label>
              <input
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#171717] px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#171717] px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Your profile helps people recognize you in group chats.
              </p>
            </div>
          </div>

          <div className="mt-2 flex w-full justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-blue-600 dark:bg-white dark:text-black px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-60 dark:hover:bg-gray-200"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
