'use client'
import { Download } from 'lucide-react'
import { exportRequestPDF } from '@/lib/pdf'
import type { FundRequest } from '@/types'

export function PDFExportButton({ request }: { request: FundRequest }) {
  return (
    <button
      onClick={() => exportRequestPDF(request)}
      className="btn-secondary"
    >
      <Download size={15} /> Export PDF
    </button>
  )
}
