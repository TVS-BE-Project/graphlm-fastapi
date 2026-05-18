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
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded border border-(--border-strong) bg-(--bg-elevated) p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-6">
          <h3 className="text-sm font-semibold text-(--text-primary) uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>Edit profile</h3>
          <button
            onClick={onClose}
            className="text-(--text-muted) hover:text-(--text-primary) transition-colors text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col items-center gap-5">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-(--border-default) relative">
              {previewUrl ? (
                <img src={previewUrl} alt="preview" className="h-full w-full object-cover" />
              ) : (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-colors rounded-full">
                <Camera className="w-5 h-5 text-(--accent-cyan)" />
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
              <label className="field-label">Display name</label>
              <input
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="field-input"
              />
              <p className="mt-1.5 text-xs text-(--text-muted)" style={{ fontFamily: 'var(--font-mono)' }}>
                Your profile helps people recognize you in group chats.
              </p>
            </div>
          </div>

          <div className="mt-2 flex w-full justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
