'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { generateTeamCode } from '@/lib/utils/code'

export async function getRoomByToken(roomToken: string) {
  const supabase = createAdminClient()
  const { data: room, error } = await supabase
    .from('rooms')
    .select('id, name, registration_open, event_id')
    .eq('registration_token', roomToken)
    .single()

  if (error || !room) {
    return { success: false, error: 'Room not found or invalid QR registration link.' }
  }

  return { success: true, room }
}

export async function registerTeam(payload: {
  roomToken: string
  teamName: string
  leaderName: string
  memberNames: string[]
}) {
  const supabase = createAdminClient()

  // 1. Verify Room
  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .select('id, name, registration_open')
    .eq('registration_token', payload.roomToken)
    .single()

  if (roomErr || !room) {
    return { success: false, error: 'Invalid room registration link.' }
  }

  if (!room.registration_open) {
    return { success: false, error: `Registration for ${room.name} is currently closed by the facilitator.` }
  }

  // 2. Validate Inputs
  const trimmedTeamName = payload.teamName.trim()
  const trimmedLeaderName = payload.leaderName.trim()
  const validMemberNames = payload.memberNames.map(m => m.trim()).filter(Boolean)

  if (!trimmedTeamName) return { success: false, error: 'Team name is required.' }
  if (!trimmedLeaderName) return { success: false, error: 'Leader name is required.' }

  // 3. Unique Team Name Check (Case Insensitive)
  const { data: existingTeam } = await supabase
    .from('teams')
    .select('id')
    .ilike('name', trimmedTeamName)
    .maybeSingle()

  if (existingTeam) {
    return { success: false, error: `The team name "${trimmedTeamName}" is already registered. Please pick another name.` }
  }

  // 4. Generate unique team code with collision retry
  let code = ''
  let attempts = 0
  while (attempts < 10) {
    code = generateTeamCode(6)
    const { data: existingCode } = await supabase
      .from('teams')
      .select('id')
      .eq('code', code)
      .maybeSingle()

    if (!existingCode) break
    attempts++
  }

  if (!code) {
    return { success: false, error: 'Failed to generate a unique team code. Please try again.' }
  }

  // 5. Insert Team
  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .insert({
      room_id: room.id,
      name: trimmedTeamName,
      code: code,
    })
    .select()
    .single()

  if (teamErr || !team) {
    console.error('Insert Team Error:', teamErr)
    return { success: false, error: 'Failed to register team. Please try again.' }
  }

  // 6. Insert Members (Leader + Members)
  const membersToInsert = [
    { team_id: team.id, name: trimmedLeaderName, is_leader: true },
    ...validMemberNames.map(mName => ({
      team_id: team.id,
      name: mName,
      is_leader: false,
    })),
  ]

  const { error: membersErr } = await supabase.from('members').insert(membersToInsert)

  if (membersErr) {
    console.error('Insert Members Error:', membersErr)
    return { success: false, error: 'Registered team, but failed to save team members.' }
  }

  return {
    success: true,
    teamCode: code,
    teamName: team.name,
    roomName: room.name,
  }
}
