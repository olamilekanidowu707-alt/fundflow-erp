'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, X } from 'lucide-react'

interface Props {
  requestId: string
  requestNumber: string
  actorId: string
  requesterEmail: string
  amount: number
  purpose: string
}

export function MarkPaidButton({ requestId, requestNumber, actorId, requesterEmail, amount, purpose }: Props) {
  const [open, setOpen] = useState(false)
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function markPaid() {
    setLoading(true)
    try {
      await supabase.from('fund_requests').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        paid_by: actorId,
        payment_reference: reference || null,
      }).eq('id', requestId)

      await supabase.from('audit_logs').insert({
        request_id: requestId, actor_id: actorId,
        action: 'Marked as paid',
        note: reference ? `Payment reference: ${reference}` : null
      })

      // Notify requester
      const { data: req } = await supabase.from('fund_requests').select('requester_id').eq('id', requestId).single()
      if (req) {
        await supabase.from('notifications').insert({
          user_id: req.requester_id, title: 'Payment sent',
          message: `${requestNumber}: Your funds have been disbursed.${reference ? ` Ref: ${reference}` : ''}`,
          type: 'success', request_id: requestId
        })
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
      <button onClick={() => setOpen(true)} className="btn-success btn-sm whitespace-nowrap">
        <CheckCircle size={13} /> Mark paid
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold">Confirm payment</h2>
              <button onClick={() => setOpen(false)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-xs text-green-600 mb-1">Amount to disburse</div>
                <div className="text-2xl font-bold text-green-800">₦{amount.toLocaleString('en-NG')}</div>
                <div className="text-xs text-green-600 mt-1">{purpose}</div>
              </div>
              <div>
                <label className="label">Payment reference (optional)</label>
                <input className="input" value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. TRF-2024-001234" />
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={markPaid} className="btn-success flex-1 justify-center" disabled={loading}>
                {loading ? 'Processing…' : 'Confirm payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
