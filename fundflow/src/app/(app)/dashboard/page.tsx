import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/Badges'
import { format } from 'date-fns'
import Link from 'next/link'
import type { FundRequest, Profile } from '@/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/login')

  const p = profile as Profile

  // Fetch requests based on role
  let query = supabase
    .from('fund_requests')
    .select('*, requester:profiles!requester_id(full_name,department), department:departments(name)')
    .order('created_at', { ascending: false })
    .limit(10)

  if (p.role === 'staff') query = query.eq('requester_id', user.id)

  const { data: requests } = await query
  const reqs = (requests || []) as FundRequest[]

  // Stats
  const pendingManager = reqs.filter(r => r.status === 'pending_manager').length
  const pendingFinance  = reqs.filter(r => r.status === 'approved_manager').length
  const paid            = reqs.filter(r => r.status === 'paid').length
  const totalPaid       = reqs.filter(r => r.status === 'paid').reduce((a, r) => a + r.amount, 0)

  const stats =
    p.role === 'staff' ? [
      { label: 'Total submitted',   value: reqs.length },
      { label: 'Pending approval',  value: reqs.filter(r => ['pending_manager','approved_manager'].includes(r.status)).length },
      { label: 'Approved / paid',   value: reqs.filter(r => ['approved_finance','paid'].includes(r.status)).length },
      { label: 'Total paid out',    value: formatCurrency(totalPaid), highlight: true },
    ] : p.role === 'manager' ? [
      { label: 'Pending my review', value: pendingManager, alert: pendingManager > 0 },
      { label: 'Forwarded to finance', value: pendingFinance },
      { label: 'Paid this period',  value: paid },
      { label: 'Total value pending', value: formatCurrency(reqs.filter(r=>r.status==='pending_manager').reduce((a,r)=>a+r.amount,0)), highlight: true },
    ] : p.role === 'finance' ? [
      { label: 'Awaiting my review', value: pendingFinance, alert: pendingFinance > 0 },
      { label: 'Ready to pay',       value: reqs.filter(r=>r.status==='approved_finance').length },
      { label: 'Paid this period',   value: paid },
      { label: 'Total disbursed',    value: formatCurrency(totalPaid), highlight: true },
    ] : [
      { label: 'Total requests',   value: reqs.length },
      { label: 'In progress',      value: reqs.filter(r=>['pending_manager','approved_manager','approved_finance'].includes(r.status)).length },
      { label: 'Paid',             value: paid },
      { label: 'Total value',      value: formatCurrency(reqs.reduce((a,r)=>a+r.amount,0)), highlight: true },
    ]

  const actionHref = p.role === 'staff' ? '/requests/new' : p.role === 'manager' || p.role === 'finance' ? '/approvals' : '/admin/requests'
  const actionLabel = p.role === 'staff' ? 'New request' : p.role === 'manager' || p.role === 'finance' ? 'Review approvals' : 'All requests'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {p.full_name.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's what's happening with fund requests</p>
        </div>
        <Link href={actionHref} className="btn-primary">
          {actionLabel}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className={`stat-card ${s.alert ? 'ring-2 ring-amber-300' : ''}`}>
            <div className="text-xs text-gray-500 mb-2">{s.label}</div>
            <div className={`text-2xl font-semibold ${s.highlight ? 'text-brand-600' : 'text-gray-900'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recent requests */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Recent requests</h2>
          <Link href={p.role === 'staff' ? '/requests' : '/approvals'} className="text-xs text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        {reqs.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No requests yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium">Request #</th>
                  {p.role !== 'staff' && <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium">Requester</th>}
                  <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium">Purpose</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium">Amount</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {reqs.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-600">{r.request_number}</td>
                    {p.role !== 'staff' && (
                      <td className="px-5 py-3.5">
                        <div className="text-xs font-medium">{(r.requester as any)?.full_name}</div>
                        <div className="text-[11px] text-gray-400">{(r.requester as any)?.department}</div>
                      </td>
                    )}
                    <td className="px-5 py-3.5 text-gray-700 max-w-xs truncate">{r.purpose}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">{formatCurrency(r.amount)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">{format(new Date(r.created_at), 'dd MMM yyyy')}</td>
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
