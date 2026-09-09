import { useAuth } from '../../context/AuthContext.jsx'

export default function Profile() {
  const { user } = useAuth()
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="border border-slate-200 rounded-xl p-4 space-y-2 text-sm bg-white">
        <div><span className="text-slate-500">Username:</span> {user?.username}</div>
        <div><span className="text-slate-500">Email:</span> {user?.email}</div>
        <div><span className="text-slate-500">Role:</span> {user?.role}</div>
        <div><span className="text-slate-500">Joined:</span> {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</div>
      </div>
    </div>
  )
}
