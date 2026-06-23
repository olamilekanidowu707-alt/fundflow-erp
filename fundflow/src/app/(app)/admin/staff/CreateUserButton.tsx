'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus } from 'lucide-react'

const ROLES = ['staff','manager','finance','admin']
const DEPTS = ['Marketing','Sales','Operations','HR','IT','Finance','Admin']

export function CreateUserButton() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'staff', department: 'Marketing' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function create() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create user')
      setOpen(false)
      setForm({ full_name: '', email: '', password: '', role: 'staff', department: 'Marketing' })
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={15} /> Add user</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold">Add new user</h2>
              <button onClick={() => setOpen(false)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Full name</label>
                <input className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="e.g. Amara Osei" />
              </div>
              <div>
                <label className="label">Email address</label>
                <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="amara@company.com" />
              </div>
              <div>
                <label className="label">Temporary password</label>
                <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 8 characters" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Role</label>
                  <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Department</label>
                  <select className="input" value={form.department} onChange={e => set('department', e.target.value)}>
                    {DEPTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={create} className="btn-primary flex-1 justify-center" disabled={loading}>
                {loading ? 'Creating…' : 'Create user'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
