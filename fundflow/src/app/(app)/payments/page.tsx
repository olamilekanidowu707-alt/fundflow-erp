import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { MarkPaidButton } from './MarkPaidButton'
import type { FundRequest } from '@/types'

export default async function PaymentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'finance') redirect('/dashboard')

  const { data: ready } = await supabase
    .from('fund_requests')
    .select('*, requester:profiles!requester_id(full_name, email), department:departments(name)')
    .eq('status', 'approved_finance')
    .order('finance_acted_at', { ascending: true })

  const { data: paid } = await supabase
    .from('fund_requests')
    .select('*, requester:profiles!requester_id(full_name), department:departments(name)')
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(20)

  const readyList = (ready || []) as FundRequest[]
  const paidList  = (paid || []) as FundRequest[]
  const totalReady = readyList.reduce((a, r) => a + r.amount, 0)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-0.5">Process approved fund requests for payment</p>
      </div>

      {/* Summary */}
      {readyList.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="text-xs text-gray-500 mb-1">Ready to pay</div>
            <div className="text-2xl font-semibold text-gray-900">{readyList.length}</div>
          </div>
          <div className="stat-card">
            <div className="text-xs text-gray-500 mb-1">Total amount</div>
            <div className="text-2xl font-semibold text-brand-600">{formatCurrency(totalReady)}</div>
          </div>
          <div className="stat-card">
            <div className="text-xs text-gray-500 mb-1">Paid this month</div>
            <div className="text-2xl font-semibold text-gray-900">{paidList.length}</div>
          </div>
        </div>
      )}

      {/* Ready to pay */}
      <div className="card">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Ready to pay ({readyList.length})</h2>
        </div>
        {readyList.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No payments pending</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Request #','Requester','Department','Purpose','Amount','Approved','Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {readyList.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500">{r.request_number}</td>
                    <td className="px-4 py-3.5 font-medium text-xs">{(r.requester as any)?.full_name}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">{(r.department as any)?.name}</td>
                    <td className="px-4 py-3.5 max-w-[160px] truncate">{r.purpose}</td>
                    <td className="px-4 py-3.5 font-bold text-gray-900 whitespace-nowrap">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                      {r.finance_acted_at ? format(new Date(r.finance_acted_at), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <MarkPaidButton requestId={r.id} requestNumber={r.request_number} actorId={user.id} requesterEmail={(r.requester as any)?.email} amount={r.amount} purpose={r.purpose} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paid history */}
      {paidList.length > 0 && (
        <div className="card">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">Recent payments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Request #','Requester','Purpose','Amount','Reference','Paid on'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paidList.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500">{r.request_number}</td>
                    <td className="px-4 py-3.5 text-xs">{(r.requester as any)?.full_name}</td>
                    <td className="px-4 py-3.5 max-w-[180px] truncate">{r.purpose}</td>
                    <td className="px-4 py-3.5 font-semibold text-gray-900">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500">{r.payment_reference || '—'}</td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs">{r.paid_at ? format(new Date(r.paid_at), 'dd MMM yyyy') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
