'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function MarkAllReadButton({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function markAll() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    router.refresh()
  }

  return (
    <button onClick={markAll} className="btn-secondary text-xs">
      Mark all read
    </button>
  )
}
