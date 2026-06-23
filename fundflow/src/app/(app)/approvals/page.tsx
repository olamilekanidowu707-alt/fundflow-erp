import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badges'
import { formatCurrency } from '@/lib/utils'
import { ReviewButton } from './ReviewButton'
import type { FundRequest, Profile } from '@/types'

export default async function ApprovalsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !['manager','finance'].includes(profile.role)) redirect('/dashboard')

  const p = profile as Profile
  const tab = searchParams.tab || 'pending'

  let statusFilter: string[]
  if (p.role === 'manager') {
    statusFilter = tab === 'pending' ? ['pending_manager'] : ['approved_manager','approved_finance','rejected','paid']
  } else {
    statusFilter = tab === 'pending' ? ['approved_manager'] : ['approved_finance','rejected','paid']
  }

  const { data } = await supabase
    .from('fund_requests')
    .select('*, requester:profiles!requester_id(full_name,department), department:departments(name)')
    .in('status', statusFilter)
    .order('created_at', { ascending: false })

  const requests = (data || []) as FundRequest[]

  const pendingCount = p.role === 'manager'
    ? await supabase.from('fund_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending_manager')
    : await supabase.from('fund_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved_manager')

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Approvals</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {p.role === 'manager' ? 'Review and approve fund requests from staff' : 'Final approval for fund requests cleared by managers'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {[
          { key: 'pending', label: 'Pending', count: pendingCount.count || 0 },
          { key: 'reviewed', label: 'Reviewed' }
        ].map(t => (
          <a
            key={t.key}
            href={`/approvals?tab=${t.key}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count ? (
              <span className="ml-1.5 bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded-full">{t.count}</span>
            ) : null}
          </a>
        ))}
      </div>

      <div className="card">
        {requests.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">
            {tab === 'pending' ? 'No requests pending your review' : 'No reviewed requests yet'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Request #','Requester','Department','Purpose','Amount','Priority','Status','Date',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500">{r.request_number}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-xs">{(r.requester as any)?.full_name}</div>
                      <div className="text-[11px] text-gray-400">{(r.requester as any)?.department}</div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">{(r.department as any)?.name}</td>
                    <td className="px-4 py-3.5 font-medium max-w-[160px] truncate">{r.purpose}</td>
                    <td className="px-4 py-3.5 font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-3.5"><PriorityBadge priority={r.priority} /></td>
                    <td className="px-4 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs whitespace-nowrap">{format(new Date(r.created_at), 'dd MMM')}</td>
                    <td className="px-4 py-3.5">
                      {tab === 'pending'
                        ? <ReviewButton request={r} role={p.role} actorId={user.id} />
                        : <a href={`/requests/${r.id}`} className="text-xs text-brand-600 hover:underline">View</a>
                      }
                    </td>
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
