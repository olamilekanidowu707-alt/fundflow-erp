'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { FundRequest } from '@/types'

interface Props {
  request: FundRequest
  role: string
  actorId: string
}

export function ReviewButton({ request: r, role, actorId }: Props) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function act(action: 'approve' | 'reject') {
    setLoading(true)
    try {
      const now = new Date().toISOString()
      let updates: Record<string, unknown> = {}

      if (action === 'approve') {
        if (role === 'manager') {
          updates = { status: 'approved_manager', manager_id: actorId, manager_note: note || null, manager_acted_at: now }
        } else {
          updates = { status: 'approved_finance', finance_id: actorId, finance_note: note || null, finance_acted_at: now }
        }
      } else {
        const noteField = role === 'manager' ? 'manager_note' : 'finance_note'
        const idField   = role === 'manager' ? 'manager_id'   : 'finance_id'
        const timeField = role === 'manager' ? 'manager_acted_at' : 'finance_acted_at'
        updates = { status: 'rejected', [idField]: actorId, [noteField]: note || null, [timeField]: now }
      }

      await supabase.from('fund_requests').update(updates).eq('id', r.id)
      await supabase.from('audit_logs').insert({
        request_id: r.id, actor_id: actorId,
        action: action === 'approve' ? (role === 'manager' ? 'Manager approved' : 'Finance approved') : 'Rejected',
        note: note || null
      })

      // In-app notification for requester
      await supabase.from('notifications').insert({
        user_id: r.requester_id,
        title: action === 'approve' ? 'Request approved' : 'Request rejected',
        message: `${r.request_number}: ${action === 'approve' ? 'Approved' : 'Rejected'} by ${role === 'manager' ? 'your manager' : 'Finance'}.${note ? ` "${note}"` : ''}`,
        type: action === 'approve' ? 'success' : 'error',
        request_id: r.id
      })

      // If manager approved, notify finance
      if (action === 'approve' && role === 'manager') {
        const { data: financeUsers } = await supabase.from('profiles').select('id').eq('role', 'finance')
        if (financeUsers) {
          await supabase.from('notifications').insert(financeUsers.map((f: any) => ({
            user_id: f.id, title: 'Fund request needs finance approval', type: 'info',
            message: `${r.request_number} approved by manager — ready for your review.`,
            request_id: r.id
          })))
        }
      }

      setOpen(false)
      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary btn-sm">Review</button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Review {r.request_number}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Requester</div>
                  <div className="font-medium">{(r.requester as any)?.full_name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Department</div>
                  <div className="font-medium">{(r.department as any)?.name || r.department_id}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Amount</div>
                  <div className="text-lg font-bold text-gray-900">{formatCurrency(r.amount)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Category</div>
                  <div className="font-medium">{r.category}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Purpose</div>
                <p className="text-sm text-gray-700">{r.purpose}</p>
              </div>
              {r.description && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">{r.description}</div>
              )}
              <div>
                <label className="label">Your note (optional)</label>
                <textarea
                  className="input h-20 resize-none"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a note for the requester…"
                />
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => act('reject')} className="btn-danger flex-1 justify-center" disabled={loading}>
                <XCircle size={15} /> Reject
              </button>
              <button onClick={() => act('approve')} className="btn-success flex-1 justify-center" disabled={loading}>
                <CheckCircle size={15} /> {role === 'manager' ? 'Approve & forward' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
