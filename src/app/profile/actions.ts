'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function updateProfile(
  _prevState: { error?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; ok?: boolean } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const display_name = (formData.get('display_name') as string).trim()
  const catchphrase = (formData.get('catchphrase') as string).trim()
  const avatar_url = formData.get('avatar_url') as string | null

  if (!display_name) return { error: 'Name cannot be empty.' }
  if (display_name.length > 30) return { error: 'Name must be 30 characters or fewer.' }
  if (catchphrase.length > 80) return { error: 'Catchphrase must be 80 characters or fewer.' }

  const update: Record<string, string | null> = { display_name, catchphrase: catchphrase || null }
  if (avatar_url) update.avatar_url = avatar_url

  const { error } = await supabase.from('users').update(update).eq('id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  return { ok: true }
}
