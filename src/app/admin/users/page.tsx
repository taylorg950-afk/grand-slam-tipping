import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import UsersList from './UsersList'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: profiles } = await supabase
    .from('users')
    .select('id, display_name, is_admin, created_at')
    .order('display_name')

  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 200 })
  const emailById = new Map((authData?.users ?? []).map(u => [u.id, u.email ?? '']))

  // Deleting an account takes its tips with it, so show the count up front.
  const { data: tipRows } = await supabase.from('tips').select('user_id')
  const tipsByUser = new Map<string, number>()
  for (const t of tipRows ?? []) tipsByUser.set(t.user_id, (tipsByUser.get(t.user_id) ?? 0) + 1)

  const { data: { user: me } } = await supabase.auth.getUser()

  const users = (profiles ?? []).map(p => ({
    id: p.id,
    display_name: p.display_name,
    is_admin: p.is_admin,
    email: emailById.get(p.id) ?? '',
    tipCount: tipsByUser.get(p.id) ?? 0,
    isMe: p.id === me?.id,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[22px] font-bold uppercase tracking-[0.04em]">Users</h1>
        <p className="text-sm text-[var(--ink-3)] mt-1">Set a password for any member, or remove an account. Deleting takes their tips with it and can&apos;t be undone.</p>
      </div>

      <UsersList users={users} />
    </div>
  )
}
