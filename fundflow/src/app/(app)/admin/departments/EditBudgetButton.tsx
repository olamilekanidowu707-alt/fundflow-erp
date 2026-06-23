'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

interface Props { deptId: string; deptName: string; currentBudget: number }

export function EditBudgetButton({ deptId, deptName, currentBudget }: Props) {
  const [open, setOpen] = useState(false)
  const [budget, setBudget] = useState(currentBudget.toString())
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function save() {
    setLoading(true)
    await supabase.from('departments').update({ monthly_budget: parseFloat(budget) }).eq('id', deptId)
    setLoading(false); setOpen(false); router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary btn-sm">Edit budget</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl w-80 shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold">Edit budget — {deptName}</h2>
              <button onClick={() => setOpen(false)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-5">
              <label className="label">Monthly budget (₦)</label>
              <input className="input" type="number" min="0" value={budget} onChange={e => setBudget(e.target.value)} />
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={save} className="btn-primary flex-1 justify-center" disabled={loading}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
