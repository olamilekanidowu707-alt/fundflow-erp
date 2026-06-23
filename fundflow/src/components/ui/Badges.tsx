import { cn, statusConfig, priorityConfig } from '@/lib/utils'
import type { RequestStatus, Priority } from '@/types'

export function StatusBadge({ status }: { status: RequestStatus }) {
  const cfg = statusConfig(status)
  return (
    <span className={cn('badge', cfg.className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {cfg.label}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = priorityConfig(priority)
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', cfg.className)}>
      {cfg.label}
    </span>
  )
}
