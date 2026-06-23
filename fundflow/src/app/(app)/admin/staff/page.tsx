import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getInitials } from '@/lib/utils'
import { CreateUserButton } from './CreateUserButton'

const roleColors: Record<string, string> = {
  staff: 'bg-green-100 text-green-800', manager: 'bg-blue-100 text-blue-800',
  finance: 'bg-amber-100 text-amber-800', admin: 'bg-purple-100 text-purple-800'
}
const roleLabels: Record<string, string> = {
  staff: 'Staff', manager: 'Manager', finance: 'Finance Director', admin: 'Admin'
}

export default async function StaffPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const { data: staff } = await supabase.from('profiles').select('*').order('full_name')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500 mt-0.5">{(staff || []).length} users</p>
        </div>
        <CreateUserButton />
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Name','Email','Department','Role','Joined'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-gray-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(staff || []).map((s: any) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {getInitials(s.full_name)}
                      </div>
                      <span className="font-medium text-gray-900">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs">{s.email}</td>
                  <td className="px-4 py-3.5 text-gray-600">{s.department}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[s.role]}`}>
                      {roleLabels[s.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-400 text-xs">{new Date(s.created_at).toLocaleDateString('en-NG')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
