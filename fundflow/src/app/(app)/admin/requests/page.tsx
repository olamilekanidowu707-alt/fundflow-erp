import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badges'
import { formatCurrency } from '@/lib/utils'
import { ExportListButton } from './ExportListButton'
import type { FundRequest } from '@/types'

export default async function AllRequestsPage({ searchParams }: { searchParams: { status?: string; dept?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  let query = supabase
    .from('fund_requests')
    .select('*, requester:profiles!requester_id(full_name), department:departments(name)')
    .order('created_at', { ascending: false })

  if (searchParams.status) query = query.eq('status', searchParams.status)
  if (searchParams.dept) query = query.eq('department_id', searchParams.dept)

  const { data } = await query
  const requests = (data || []) as FundRequest[]
  const total = requests.reduce((a, r) => a + r.amount, 0)

  const STATUSES = ['pending_manager','approved_manager','approved_finance','rejected','paid']

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">All requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">{requests.length} requests · Total: {formatCurrency(total)}</p>
        </div>
        <ExportListButton requests={requests} />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <a href="/admin/requests" className={`btn-secondary btn-sm ${!searchParams.status ? 'ring-2 ring-brand-600' : ''}`}>All</a>
        {STATUSES.map(s => (
          <a key={s} href={`/admin/requests?status=${s}`}
            className={`btn-secondary btn-sm capitalize ${searchParams.status === s ? 'ring-2 ring-brand-600' : ''}`}>
            {s.replace('_', ' ')}
          </a>
        ))}
      </div>

      <div className="card">
        {requests.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No requests found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Request #','Requester','Department','Purpose','Amount','Priority','Status','Date'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500">{r.request_number}</td>
                    <td className="px-4 py-3.5 text-xs font-medium">{(r.requester as any)?.full_name}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">{(r.department as any)?.name}</td>
                    <td className="px-4 py-3.5 max-w-[160px] truncate">{r.purpose}</td>
                    <td className="px-4 py-3.5 font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-3.5"><PriorityBadge priority={r.priority} /></td>
                    <td className="px-4 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs whitespace-nowrap">{format(new Date(r.created_at), 'dd MMM yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
