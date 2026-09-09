import { useEffect, useState } from 'react'
import { getAdminUsers, updateUserRole, updateUserActive } from '../../services/api.js'

const ROLES = ['USER', 'ANALYST', 'ADMIN']

export default function UserManagement() {
  const [users, setUsers] = useState([])

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
    <div>
      <h1 className="text-2xl font-semibold mb-4">User Management</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-400 text-left border-b border-slate-800">
            <tr>
              <th className="py-2 pr-4">Username</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-800/50">
                <td className="py-2 pr-4">{u.username}</td>
                <td className="py-2 pr-4 text-slate-400">{u.email}</td>
                <td className="py-2 pr-4">
                  <select
                    value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="bg-bg-panel2 border border-slate-700 rounded-lg px-2 py-1 text-xs"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="py-2 pr-4">
                  <button
                    onClick={() => handleToggleActive(u.id, u.is_active)}
                    className={`text-xs px-2 py-1 rounded-full ${u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                  >
                    {u.is_active ? 'Active' : 'Disabled'}
                  </button>
                </td>
                <td className="py-2 pr-4 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
