import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { RequestStatus, Priority } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return '₦' + amount.toLocaleString('en-NG')
}

export function statusConfig(status: RequestStatus) {
  const map: Record<RequestStatus, { label: string; className: string }> = {
    pending_manager:  { label: 'Pending manager',  className: 'bg-amber-50 text-amber-800 border-amber-200' },
    approved_manager: { label: 'Pending finance',  className: 'bg-purple-50 text-purple-800 border-purple-200' },
    approved_finance: { label: 'Finance approved', className: 'bg-green-50 text-green-800 border-green-200' },
    rejected:         { label: 'Rejected',          className: 'bg-red-50 text-red-800 border-red-200' },
    paid:             { label: 'Paid',              className: 'bg-blue-50 text-blue-800 border-blue-200' },
  }
  return map[status]
}

export function priorityConfig(priority: Priority) {
  const map: Record<Priority, { label: string; className: string }> = {
    low:    { label: 'Low',    className: 'bg-gray-100 text-gray-600' },
    normal: { label: 'Normal', className: 'bg-blue-50 text-blue-700' },
    high:   { label: 'High',   className: 'bg-orange-50 text-orange-700' },
    urgent: { label: 'Urgent', className: 'bg-red-50 text-red-700' },
  }
  return map[priority]
}

export function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
