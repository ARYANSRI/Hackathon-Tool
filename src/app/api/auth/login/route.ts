import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { memberId, teamId, deviceToken } = body

    if (!memberId || !teamId) {
      return NextResponse.json({ success: false, error: 'Missing memberId or teamId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Real DB Session Upsert
    const { error } = await supabase.from('sessions').upsert(
      {
        member_id: memberId,
        device_token: deviceToken || `dev_${memberId}`,
        last_seen: new Date().toISOString(),
      },
      { onConflict: 'member_id' }
    )

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, memberId, teamId })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
