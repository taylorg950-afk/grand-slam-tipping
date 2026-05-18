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

  const users = (profiles ?? []).map(p => ({
    id: p.id,
    display_name: p.display_name,
    is_admin: p.is_admin,
    email: emailById.get(p.id) ?? '',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="text-sm text-zinc-500 mt-1">Set a password for any user. They can change it later.</p>
      </div>

      <UsersList users={users} />
    </div>
  )
}
