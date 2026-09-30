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

  // 2. Ensure 10 rooms exist
  const defaultRooms = Array.from({ length: 10 }, (_, i) => {
    const roomNum = i + 1
    return {
      event_id: event!.id,
      name: `Lab Room ${roomNum < 10 ? '0' + roomNum : roomNum}`,
      registration_token: `room-${roomNum < 10 ? '0' + roomNum : roomNum}`,
      registration_open: true,
    }
  })

  for (const r of defaultRooms) {
    const { data: existing } = await supabase
      .from('rooms')
      .select('id')
      .eq('registration_token', r.registration_token)
      .maybeSingle()

    if (!existing) {
      await supabase.from('rooms').insert(r)
    }
  }

  return { success: true }
}
