'use server'

import { createAdminClient } from '@/lib/supabase/admin'
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
