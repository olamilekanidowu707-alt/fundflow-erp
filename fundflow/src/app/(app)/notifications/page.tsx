import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { Bell, CheckCheck } from 'lucide-react'
import { MarkAllReadButton } from './MarkAllReadButton'

export default async function NotificationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const notifications = data || []
  const unread = notifications.filter((n: any) => !n.read).length

  const typeColors: Record<string, string> = {
    info: 'bg-blue-50 text-blue-600', success: 'bg-green-50 text-green-600',
    warning: 'bg-amber-50 text-amber-600', error: 'bg-red-50 text-red-600'
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">{unread} unread</p>
        </div>
        {unread > 0 && <MarkAllReadButton userId={user.id} />}
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="card py-20 text-center text-gray-400 text-sm">
            <Bell size={32} className="mx-auto mb-3 opacity-40" />
            No notifications yet
          </div>
        ) : notifications.map((n: any) => (
          <div key={n.id} className={`card p-4 flex gap-3 ${!n.read ? 'border-l-2 border-l-brand-600' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${typeColors[n.type] || 'bg-gray-100 text-gray-500'}`}>
              <Bell size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-sm text-gray-900">{n.title}</div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0 mt-1" />}
              </div>
              <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
              <div className="text-xs text-gray-400 mt-1">{format(new Date(n.created_at), 'dd MMM yyyy, HH:mm')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
