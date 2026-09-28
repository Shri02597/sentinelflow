import { useEffect, useState } from 'react'
import { getAdminUsers, updateUserRole, updateUserActive } from '../../services/api.js'
import { SectionHeader, Skeleton } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'

const ROLES = ['USER', 'ANALYST', 'ADMIN']

export default function UserManagement() {
  const [users, setUsers] = useState(null)

  function load() {
    getAdminUsers().then((res) => setUsers(res.data))
  }
  useEffect(load, [])

  async function handleRoleChange(userId, role) {
    await updateUserRole(userId, role)
    load()
  }

  async function handleToggleActive(userId, isActive) {
    await updateUserActive(userId, !isActive)
    load()
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <SectionHeader title="User Management" subtitle="Change roles and enable or disable accounts" />

      <div className="card overflow-x-auto p-0">
        {users === null ? (
          <div className="space-y-2 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/15 text-2xs font-bold uppercase text-accent">
                        {u.username?.[0] ?? '?'}
                      </span>
                      <span className="text-xs font-semibold text-slate-100">{u.username}</span>
                    </div>
                  </td>
                  <td className="font-mono text-2xs text-slate-400">{u.email}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      aria-label={`Role for ${u.username}`}
                      className="input w-auto py-1 text-2xs"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      className={`badge ${u.is_active ? 'badge-LOW' : 'badge-CRITICAL'}`}
                    >
                      <Icon name={u.is_active ? 'check' : 'close'} size={10} />
                      {u.is_active ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="font-mono text-2xs text-slate-500 whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
