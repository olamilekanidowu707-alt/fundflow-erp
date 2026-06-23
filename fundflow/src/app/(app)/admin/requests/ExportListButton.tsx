'use client'
import { Download } from 'lucide-react'
import { exportRequestsListPDF } from '@/lib/pdf'
import type { FundRequest } from '@/types'

export function ExportListButton({ requests }: { requests: FundRequest[] }) {
  return (
    <button onClick={() => exportRequestsListPDF(requests)} className="btn-secondary">
      <Download size={15} /> Export PDF
    </button>
  )
}
