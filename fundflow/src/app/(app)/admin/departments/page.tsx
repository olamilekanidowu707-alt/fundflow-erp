import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { EditBudgetButton } from './EditBudgetButton'

export default async function DepartmentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const { data: depts } = await supabase.from('departments').select('*').order('name')

  // Get this month's spending per dept
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)
  const { data: spending } = await supabase
    .from('fund_requests')
    .select('department_id, amount, status')
    .gte('created_at', startOfMonth.toISOString())
    .neq('status', 'rejected')

  const spendMap: Record<string, { requested: number; paid: number }> = {}
  for (const s of spending || []) {
    if (!spendMap[s.department_id]) spendMap[s.department_id] = { requested: 0, paid: 0 }
    spendMap[s.department_id].requested += s.amount
    if (s.status === 'paid') spendMap[s.department_id].paid += s.amount
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Departments & budgets</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage monthly budget limits per department</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Department','Monthly budget','Requested (month)','Paid (month)','Remaining','Utilisation',''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-gray-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(depts || []).map((d: any) => {
              const s = spendMap[d.id] || { requested: 0, paid: 0 }
              const remaining = d.monthly_budget - s.requested
              const pct = Math.min(100, Math.round((s.requested / d.monthly_budget) * 100))
              return (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3.5 font-medium">{d.name}</td>
                  <td className="px-4 py-3.5 font-semibold">{formatCurrency(d.monthly_budget)}</td>
                  <td className="px-4 py-3.5 text-gray-700">{formatCurrency(s.requested)}</td>
                  <td className="px-4 py-3.5 text-green-700">{formatCurrency(s.paid)}</td>
                  <td className={`px-4 py-3.5 font-semibold ${remaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatCurrency(remaining)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-400' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <EditBudgetButton deptId={d.id} deptName={d.name} currentBudget={d.monthly_budget} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
