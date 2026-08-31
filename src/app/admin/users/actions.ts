'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-admin'
import { revalidatePath } from 'next/cache'

export async function setUserPassword(
  userId: string,
  formData: FormData
): Promise<{ error: string } | { ok: true }> {
  const authError = await requireAdmin()
  if (authError) return { error: authError.error }

  const password = (formData.get('password') as string) ?? ''
  if (password.length < 6) return { error: 'Password must be at least 6 characters.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { ok: true }
}

export async function deleteUser(
  userId: string
): Promise<{ error: string } | { ok: true }> {
  const authError = await requireAdmin()
  if (authError) return { error: authError.error }

  const supabase = await createClient()
  const { data: { user: me } } = await supabase.auth.getUser()
  if (me?.id === userId) {
    return { error: "You can't delete your own account here." }
  }

  const { data: target } = await supabase
    .from('users')
    .select('is_admin, display_name')
    .eq('id', userId)
    .single()
  if (!target) return { error: 'That account no longer exists.' }

  // Never leave the comp without an admin — there's no UI to grant the flag back.
  if (target.is_admin) {
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_admin', true)
    if ((count ?? 0) <= 1) {
      return { error: 'That’s the last admin. Make someone else an admin first.' }
    }
  }

  // Deleting the auth user cascades to their profile, tips and tiebreakers.
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  revalidatePath('/admin/picks')
  return { ok: true }
}
