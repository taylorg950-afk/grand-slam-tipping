'use client'

import { useActionState, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from './actions'

interface Props {
  userId: string
  initial: {
    display_name: string
    catchphrase: string | null
    avatar_url: string | null
  }
}

export default function ProfileForm({ userId, initial }: Props) {
  const [state, action, pending] = useActionState(updateProfile, null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatar_url)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2 MB.')
      return
    }

    setUploading(true)
    const supabase = createClient()
    const path = `${userId}/avatar`

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (error) {
      alert('Upload failed: ' + error.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(data.publicUrl + `?t=${Date.now()}`)
    setUploading(false)
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="avatar_url" value={avatarUrl ?? ''} />

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative shrink-0 w-20 h-20 rounded-full overflow-hidden
                     border-2 border-[#15231B20] hover:border-[var(--brick)] transition-colors group"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[var(--paper-2)] flex items-center justify-center
                            font-serif italic text-3xl text-[var(--ink-2)]">
              ?
            </div>
          )}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100
                          transition-opacity flex items-center justify-center
                          text-white text-[10px] uppercase tracking-[0.14em] font-semibold">
            {uploading ? '…' : 'Change'}
          </div>
        </button>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-2)] font-semibold mb-1">
            Profile photo
          </div>
          <p className="text-[11px] text-[var(--ink-2)] opacity-60">
            Tap to upload. JPG or PNG, under 2 MB.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      {/* Display name */}
      <div className="space-y-1.5">
        <label htmlFor="display_name"
               className="block text-[10px] uppercase tracking-[0.18em] text-[var(--ink-2)] font-semibold">
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          defaultValue={initial.display_name}
          maxLength={30}
          required
          className="w-full rounded-[2px] border border-[#15231B30] bg-white px-3 py-2.5
                     text-[15px] text-[var(--ink)] focus:outline-none focus:border-[var(--brick)] transition-colors"
        />
        <p className="text-[10px] text-[var(--ink-2)] opacity-60">This is how you appear in the standings.</p>
      </div>

      {/* Catchphrase */}
      <div className="space-y-1.5">
        <label htmlFor="catchphrase"
               className="block text-[10px] uppercase tracking-[0.18em] text-[var(--ink-2)] font-semibold">
          Catchphrase <span className="font-normal normal-case opacity-50">· optional</span>
        </label>
        <input
          id="catchphrase"
          name="catchphrase"
          type="text"
          defaultValue={initial.catchphrase ?? ''}
          maxLength={80}
          placeholder="e.g. Always back the Serb."
          className="w-full rounded-[2px] border border-[#15231B30] bg-white px-3 py-2.5
                     text-[15px] text-[var(--ink)] placeholder-[#15231B40]
                     focus:outline-none focus:border-[var(--brick)] transition-colors"
        />
        <p className="text-[10px] text-[var(--ink-2)] opacity-60">Shown on your profile. Keep it short.</p>
      </div>

      {state?.error && <p className="text-sm text-[var(--brick)]">{state.error}</p>}
      {state?.ok && <p className="text-sm text-[var(--olive)] font-medium">Saved.</p>}

      <button
        type="submit"
        disabled={pending || uploading}
        className="w-full py-3 rounded-[2px] text-[11px] uppercase tracking-[0.2em] font-semibold
                   bg-[var(--ink)] text-[var(--paper)] disabled:opacity-50 transition-opacity"
      >
        {pending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  )
}
