'use client'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import type { FundRequest } from '@/types'

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending_manager: 'Pending Manager',
    approved_manager: 'Pending Finance',
    approved_finance: 'Finance Approved',
    rejected: 'Rejected',
    paid: 'Paid',
  }
  return map[s] || s
}

export function exportRequestPDF(req: FundRequest) {
  const doc = new jsPDF()

  // Header bar
  doc.setFillColor(24, 95, 165)
  doc.rect(0, 0, 210, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('FundFlow ERP', 14, 14)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Fund Request Document', 210 - 14, 14, { align: 'right' })

  // Title
  doc.setTextColor(17, 24, 39)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`Fund Request — ${req.request_number}`, 14, 36)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(107, 114, 128)
  doc.text(`Generated ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, 14, 43)

  // Details table
  autoTable(doc, {
    startY: 50,
    head: [['Field', 'Details']],
    body: [
      ['Request Number', req.request_number],
      ['Requester', req.requester?.full_name || '—'],
      ['Department', req.department?.name || '—'],
      ['Purpose', req.purpose],
      ['Category', req.category],
      ['Amount', fmt(req.amount)],
      ['Priority', req.priority.charAt(0).toUpperCase() + req.priority.slice(1)],
      ['Status', statusLabel(req.status)],
      ['Date Submitted', format(new Date(req.created_at), 'dd MMM yyyy')],
      ['Needed By', req.needed_by_date ? format(new Date(req.needed_by_date), 'dd MMM yyyy') : '—'],
    ],
    headStyles: { fillColor: [24, 95, 165], fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold', textColor: [107, 114, 128] } },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 14, right: 14 },
  })

  const y1 = (doc as any).lastAutoTable.finalY + 10

  // Description
  if (req.description) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17, 24, 39)
    doc.text('Description', 14, y1)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(55, 65, 81)
    const lines = doc.splitTextToSize(req.description, 182)
    doc.text(lines, 14, y1 + 7)
  }

  // Approval trail
  const approvalRows: string[][] = []
  approvalRows.push(['Submitted', req.requester?.full_name || '—', format(new Date(req.created_at), 'dd MMM yyyy'), '✓'])
  if (req.manager_acted_at) {
    approvalRows.push([
      req.status === 'rejected' && !req.finance_acted_at ? 'Rejected' : 'Manager Approved',
      req.manager?.full_name || '—',
      format(new Date(req.manager_acted_at), 'dd MMM yyyy'),
      req.manager_note || '—',
    ])
  }
  if (req.finance_acted_at) {
    approvalRows.push([
      req.status === 'rejected' ? 'Rejected' : 'Finance Approved',
      req.finance_officer?.full_name || '—',
      format(new Date(req.finance_acted_at), 'dd MMM yyyy'),
      req.finance_note || '—',
    ])
  }
  if (req.paid_at) {
    approvalRows.push(['Paid', req.payment_reference || '—', format(new Date(req.paid_at), 'dd MMM yyyy'), '✓'])
  }

  const y2 = req.description
    ? (doc as any).lastAutoTable.finalY + 30
    : y1

  autoTable(doc, {
    startY: y2,
    head: [['Stage', 'Actor', 'Date', 'Note']],
    body: approvalRows,
    headStyles: { fillColor: [59, 109, 17], fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 10 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(17, 24, 39)
    }
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setTextColor(156, 163, 175)
    doc.text(`FundFlow ERP · Confidential · Page ${i} of ${pageCount}`, 105, 290, { align: 'center' })
  }

  doc.save(`${req.request_number}.pdf`)
}

export function exportRequestsListPDF(requests: FundRequest[], title = 'Fund Requests Report') {
  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFillColor(24, 95, 165)
  doc.rect(0, 0, 297, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('FundFlow ERP', 14, 14)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(format(new Date(), 'dd MMM yyyy'), 297 - 14, 14, { align: 'right' })

  doc.setTextColor(17, 24, 39)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 36)

  autoTable(doc, {
    startY: 42,
    head: [['Request #', 'Requester', 'Department', 'Purpose', 'Category', 'Amount', 'Status', 'Date']],
    body: requests.map(r => [
      r.request_number,
      r.requester?.full_name || '—',
      r.department?.name || '—',
      r.purpose.length > 35 ? r.purpose.slice(0, 35) + '…' : r.purpose,
      r.category,
      fmt(r.amount),
      statusLabel(r.status),
      format(new Date(r.created_at), 'dd MMM yyyy'),
    ]),
    headStyles: { fillColor: [24, 95, 165], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 14, right: 14 },
  })

  const total = requests.reduce((a, r) => a + r.amount, 0)
  const y = (doc as any).lastAutoTable.finalY + 6
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 24, 39)
  doc.text(`Total: ${fmt(total)}`, 297 - 14, y, { align: 'right' })

  doc.save(`fund-requests-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}
