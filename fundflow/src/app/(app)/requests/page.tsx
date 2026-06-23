import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Plus, Download } from 'lucide-react'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badges'
import { formatCurrency } from '@/lib/utils'
import type { FundRequest } from '@/types'

export default async function RequestsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data } = await supabase
    .from('fund_requests')
    .select('*, department:departments(name)')
    .eq('requester_id', user.id)
    .order('created_at', { ascending: false })

  const requests = (data || []) as FundRequest[]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">My requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">{requests.length} total · {requests.filter(r=>r.status==='paid').length} paid</p>
        </div>
        <Link href="/requests/new" className="btn-primary">
          <Plus size={15} /> New request
        </Link>
      </div>

      <div className="card">
        {requests.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-gray-400 text-sm mb-3">No requests yet</div>
            <Link href="/requests/new" className="btn-primary inline-flex"><Plus size={15} /> Create your first request</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Request #','Purpose','Category','Department','Amount','Priority','Status','Date',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500">{r.request_number}</td>
                    <td className="px-4 py-3.5 font-medium max-w-[180px] truncate">{r.purpose}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">{r.category}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">{(r.department as any)?.name}</td>
                    <td className="px-4 py-3.5 font-semibold text-gray-900">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-3.5"><PriorityBadge priority={r.priority} /></td>
                    <td className="px-4 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs whitespace-nowrap">{format(new Date(r.created_at), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3.5">
                      <Link href={`/requests/${r.id}`} className="text-xs text-brand-600 hover:underline">View</Link>
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
