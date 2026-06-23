'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, AlertCircle } from 'lucide-react'
import type { Department } from '@/types'

const CATEGORIES = ['Travel','Marketing','Operations','IT','Training','Entertainment','Procurement','Other']
const PRIORITIES = ['low','normal','high','urgent']

export default function NewRequestPage() {
  const router = useRouter()
  const supabase = createClient()

  const [departments, setDepartments] = useState<Department[]>([])
  const [budgetInfo, setBudgetInfo] = useState<{used: number; limit: number} | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    department_id: '', purpose: '', description: '',
    amount: '', category: 'Other', priority: 'normal', needed_by_date: ''
  })

  useEffect(() => {
    supabase.from('departments').select('*').order('name').then(({ data }) => {
      setDepartments(data || [])
    })
  }, [])

  useEffect(() => {
    if (!form.department_id) return
    fetchBudget(form.department_id)
  }, [form.department_id])

  async function fetchBudget(deptId: string) {
    const dept = departments.find(d => d.id === deptId)
    if (!dept) return
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)
    const { data } = await supabase
      .from('fund_requests')
      .select('amount')
      .eq('department_id', deptId)
      .neq('status', 'rejected')
      .gte('created_at', startOfMonth.toISOString())
    const used = (data || []).reduce((a: number, r: any) => a + r.amount, 0)
    setBudgetInfo({ used, limit: dept.monthly_budget })
  }

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.purpose || !form.amount || !form.department_id) {
      setError('Please fill in all required fields.'); return
    }
    setLoading(true); setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload attachments
      const urls: string[] = []
      for (const file of files) {
        const path = `${user.id}/${Date.now()}-${file.name}`
        const { error: uploadErr } = await supabase.storage.from('attachments').upload(path, file)
        if (!uploadErr) urls.push(path)
      }

      const { data: req, error: reqErr } = await supabase.from('fund_requests').insert({
        requester_id: user.id,
        department_id: form.department_id,
        purpose: form.purpose,
        description: form.description || null,
        amount: parseFloat(form.amount),
        category: form.category,
        priority: form.priority,
        needed_by_date: form.needed_by_date || null,
        attachment_urls: urls,
      }).select().single()

      if (reqErr) throw reqErr

      // Log
      await supabase.from('audit_logs').insert({ request_id: req.id, actor_id: user.id, action: 'Submitted' })

      // Notify managers
      const { data: managers } = await supabase.from('profiles').select('id').eq('role', 'manager')
      if (managers) {
        await supabase.from('notifications').insert(managers.map((m: any) => ({
          user_id: m.id, title: 'New fund request', type: 'info',
          message: `${req.request_number}: ${form.purpose} — ${Number(form.amount).toLocaleString('en-NG', {style:'currency',currency:'NGN'})}`,
          request_id: req.id
        })))
      }

      router.push('/requests')
    } catch (err: any) {
      setError(err.message || 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  const amount = parseFloat(form.amount) || 0
  const budgetRemaining = budgetInfo ? budgetInfo.limit - budgetInfo.used : null
  const overBudget = budgetRemaining !== null && amount > budgetRemaining

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
          ← Back
        </button>
        <h1 className="text-lg font-semibold text-gray-900">New fund request</h1>
        <p className="text-sm text-gray-500 mt-0.5">Submit a request for funds — your manager will review it first</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Purpose */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-900">Request details</h2>
          <div>
            <label className="label">Purpose <span className="text-red-500">*</span></label>
            <input className="input" value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="What are the funds for?" maxLength={120} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input h-24 resize-none" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Additional context or justification…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category <span className="text-red-500">*</span></label>
              <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Needed by date</label>
            <input className="input" type="date" value={form.needed_by_date} onChange={e => set('needed_by_date', e.target.value)} min={new Date().toISOString().split('T')[0]} />
          </div>
        </div>

        {/* Amount + Department */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-900">Amount & department</h2>
          <div>
            <label className="label">Department <span className="text-red-500">*</span></label>
            <select className="input" value={form.department_id} onChange={e => set('department_id', e.target.value)} required>
              <option value="">Select department…</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Amount (₦) <span className="text-red-500">*</span></label>
            <input className="input" type="number" min="1" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" required />
            {budgetInfo && (
              <div className={`mt-1.5 text-xs flex items-center gap-1 ${overBudget ? 'text-red-600' : 'text-gray-500'}`}>
                {overBudget && <AlertCircle size={12} />}
                Monthly budget: {budgetInfo.limit.toLocaleString('en-NG', {style:'currency',currency:'NGN'})} · Used: {budgetInfo.used.toLocaleString('en-NG', {style:'currency',currency:'NGN'})} · Remaining: {(budgetInfo.limit - budgetInfo.used).toLocaleString('en-NG', {style:'currency',currency:'NGN'})}
                {overBudget && ' — exceeds remaining budget'}
              </div>
            )}
          </div>
        </div>

        {/* Attachments */}
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Attachments</h2>
          <label className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-6 cursor-pointer hover:border-brand-300 hover:bg-brand-50 transition-colors">
            <Upload size={20} className="text-gray-400" />
            <span className="text-sm text-gray-500">Click to upload receipts or supporting documents</span>
            <span className="text-xs text-gray-400">PDF, PNG, JPG up to 10MB each</span>
            <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={e => setFiles(Array.from(e.target.files || []))} />
          </label>
          {files.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-gray-400">{(f.size/1024).toFixed(0)} KB</span>
                  <button type="button" onClick={() => setFiles(files.filter((_,j)=>j!==i))} className="text-gray-400 hover:text-red-500">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
            <AlertCircle size={16} />{error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>
    </div>
  )
}
