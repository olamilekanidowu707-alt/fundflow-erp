import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { format } from 'date-fns'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badges'
import { formatCurrency } from '@/lib/utils'
import { CheckCircle2, Clock, XCircle, Download } from 'lucide-react'
import type { FundRequest, AuditLog } from '@/types'
import { PDFExportButton } from './PDFExportButton'

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: req } = await supabase
    .from('fund_requests')
    .select(`*, requester:profiles!requester_id(*), department:departments(*), manager:profiles!manager_id(*), finance_officer:profiles!finance_id(*)`)
    .eq('id', params.id)
    .single()

  if (!req) notFound()

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*, actor:profiles(full_name)')
    .eq('request_id', params.id)
    .order('created_at', { ascending: true })

  const r = req as FundRequest
  const auditLogs = (logs || []) as AuditLog[]

  const steps = [
    { label: 'Submitted', actor: (r.requester as any)?.full_name, date: r.created_at, done: true },
    { label: 'Manager review', actor: (r.manager as any)?.full_name, date: r.manager_acted_at, done: !!r.manager_acted_at, note: r.manager_note },
    { label: 'Finance review', actor: (r.finance_officer as any)?.full_name, date: r.finance_acted_at, done: !!r.finance_acted_at, note: r.finance_note },
    { label: 'Payment', actor: null, date: r.paid_at, done: r.status === 'paid', note: r.payment_reference ? `Ref: ${r.payment_reference}` : undefined },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <a href="/requests" className="text-sm text-gray-400 hover:text-gray-600">← My requests</a>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-sm text-gray-500">{r.request_number}</span>
            <StatusBadge status={r.status} />
            <PriorityBadge priority={r.priority} />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{r.purpose}</h1>
        </div>
        <PDFExportButton request={r} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main info */}
        <div className="col-span-2 space-y-5">
          {/* Details */}
          <div className="card p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-4">Request details</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {[
                ['Requester', (r.requester as any)?.full_name],
                ['Department', (r.department as any)?.name],
                ['Amount', formatCurrency(r.amount)],
                ['Category', r.category],
                ['Needed by', r.needed_by_date ? format(new Date(r.needed_by_date), 'dd MMM yyyy') : '—'],
                ['Submitted', format(new Date(r.created_at), 'dd MMM yyyy, HH:mm')],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                  <div className="font-medium text-gray-900">{value}</div>
                </div>
              ))}
            </div>
            {r.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-400 mb-1">Description</div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.description}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {(r.manager_note || r.finance_note) && (
            <div className="card p-5 space-y-3">
              <h2 className="text-sm font-medium text-gray-900">Notes</h2>
              {r.manager_note && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-[11px] text-blue-400 font-medium uppercase tracking-wide mb-1">Manager note</div>
                  <p className="text-sm text-blue-900">{r.manager_note}</p>
                </div>
              )}
              {r.finance_note && (
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-[11px] text-green-400 font-medium uppercase tracking-wide mb-1">Finance note</div>
                  <p className="text-sm text-green-900">{r.finance_note}</p>
                </div>
              )}
            </div>
          )}

          {/* Audit log */}
          {auditLogs.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-4">Activity</h2>
              <div className="space-y-3">
                {auditLogs.map(log => (
                  <div key={log.id} className="flex gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 size={12} className="text-gray-500" />
                    </div>
                    <div>
                      <span className="font-medium">{(log.actor as any)?.full_name}</span>
                      <span className="text-gray-500"> · {log.action}</span>
                      {log.note && <p className="text-gray-500 text-xs mt-0.5">"{log.note}"</p>}
                      <div className="text-[11px] text-gray-400 mt-0.5">{format(new Date(log.created_at), 'dd MMM yyyy, HH:mm')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Approval trail sidebar */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-4">Approval trail</h2>
            <div className="space-y-1">
              {steps.map((step, i) => (
                <div key={i} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < steps.length - 1 && (
                    <div className="absolute left-3 top-6 bottom-0 w-px bg-gray-100" />
                  )}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                    step.done && r.status !== 'rejected'
                      ? 'bg-green-100 text-green-700'
                      : r.status === 'rejected' && i === steps.findIndex(s => !s.done)
                      ? 'bg-red-100 text-red-600'
                      : step.done ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {step.done
                      ? <CheckCircle2 size={13} />
                      : r.status === 'rejected' && !step.done && i > 0
                      ? <XCircle size={13} />
                      : <Clock size={13} />
                    }
                  </div>
                  <div className="pt-0.5">
                    <div className="text-xs font-medium text-gray-900">{step.label}</div>
                    {step.actor && <div className="text-[11px] text-gray-400">{step.actor}</div>}
                    {step.date && <div className="text-[11px] text-gray-400">{format(new Date(step.date), 'dd MMM yyyy')}</div>}
                    {step.note && <div className="text-[11px] text-gray-500 mt-0.5 italic">"{step.note}"</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
