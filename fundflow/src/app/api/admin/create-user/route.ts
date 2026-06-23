import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    // Verify caller is admin
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { full_name, email, password, role, department } = await req.json()
    if (!full_name || !email || !password || !role || !department) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Use service role client to create user
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true
    })

    if (createErr || !newUser.user) {
      return NextResponse.json({ error: createErr?.message || 'Failed to create user' }, { status: 400 })
    }

    // Create profile
    const { error: profileErr } = await admin.from('profiles').insert({
      id: newUser.user.id, full_name, email, role, department
    })

    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
