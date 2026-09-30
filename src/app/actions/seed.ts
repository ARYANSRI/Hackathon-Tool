'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function ensureDefaultEventAndRooms() {
  const supabase = createAdminClient()

  // 1. Ensure event exists
  let { data: event } = await supabase
    .from('events')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (!event) {
    const { data: newEvent, error: eventErr } = await supabase
      .from('events')
      .insert({
        name: 'College Hackathon 2026',
        status: 'live',
      })
      .select('id')
      .single()

    if (eventErr || !newEvent) {
      console.error('Error creating event:', eventErr)
      return { success: false, error: 'Failed to create event.' }
    }
    event = newEvent
  }

  // 2. Fetch existing rooms in 1 single query
  const { data: existingRooms } = await supabase
    .from('rooms')
    .select('registration_token')
    .eq('event_id', event.id)

  const existingTokens = new Set((existingRooms || []).map((r) => r.registration_token))

  // 3. Filter missing default rooms
  const defaultRooms = Array.from({ length: 10 }, (_, i) => {
    const roomNum = i + 1
    const token = `room-${roomNum < 10 ? '0' + roomNum : roomNum}`
    return {
      event_id: event!.id,
      name: `Lab Room ${roomNum < 10 ? '0' + roomNum : roomNum}`,
      registration_token: token,
      registration_open: true,
    }
  })

  const missingRooms = defaultRooms.filter((r) => !existingTokens.has(r.registration_token))

  // 4. Batch insert missing rooms all at once
  if (missingRooms.length > 0) {
    await supabase.from('rooms').insert(missingRooms)
  }

  return { success: true }
}
