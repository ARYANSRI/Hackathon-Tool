'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { generateTeamCode } from '@/lib/utils/code'
import { revalidatePath } from 'next/cache'

export async function getFacilitatorRoomData(roomToken: string) {
  const supabase = createAdminClient()

  // Get Room
  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .select('id, name, registration_token, registration_open, event_id')
    .eq('registration_token', roomToken)
    .maybeSingle()

  if (roomErr || !room) {
    return { success: false, error: 'Facilitator room not found. Invalid room token.' }
  }

  // Get Teams in Room with Members
  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      code,
      created_at,
      members (
        id,
        name,
        is_leader,
        created_at
      )
    `)
    .eq('room_id', room.id)
    .order('created_at', { ascending: false })

  if (teamsErr) {
    console.error('Fetch teams error:', teamsErr)
    return { success: false, error: 'Failed to load room teams.' }
  }

  const totalTeams = teams.length
  const totalMembers = teams.reduce((acc, t) => acc + (t.members?.length || 0), 0)

  return {
    success: true,
    room,
    stats: { totalTeams, totalMembers },
    teams,
  }
}

export async function toggleRegistrationStatus(roomToken: string, isOpen: boolean) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('rooms')
    .update({ registration_open: isOpen })
    .eq('registration_token', roomToken)

  if (error) {
    return { success: false, error: 'Failed to update registration status.' }
  }

  try {
    if (roomToken) {
      revalidatePath(`/facilitator/${roomToken}`)
      revalidatePath(`/register/${roomToken}`)
    }
  } catch {}
  return { success: true, registration_open: isOpen }
}

export async function regenerateTeamCode(teamId: string, roomToken?: string) {
  const supabase = createAdminClient()

  let newCode = ''
  let attempts = 0
  while (attempts < 10) {
    newCode = generateTeamCode(6)
    const { data: existing } = await supabase
      .from('teams')
      .select('id')
      .eq('code', newCode)
      .maybeSingle()

    if (!existing) break
    attempts++
  }

  if (!newCode) {
    return { success: false, error: 'Failed to generate code.' }
  }

  const { error } = await supabase
    .from('teams')
    .update({ code: newCode })
    .eq('id', teamId)

  if (error) {
    return { success: false, error: 'Failed to update team code.' }
  }

  try {
    if (roomToken) revalidatePath(`/facilitator/${roomToken}`)
  } catch {}
  return { success: true, newCode }
}

export async function editTeamDetails(payload: {
  teamId: string
  teamName: string
  members: { id?: string; name: string; is_leader: boolean }[]
  roomToken: string
}) {
  const supabase = createAdminClient()

  // Update Team Name
  const { error: teamErr } = await supabase
    .from('teams')
    .update({ name: payload.teamName.trim() })
    .eq('id', payload.teamId)

  if (teamErr) {
    return { success: false, error: 'Failed to update team name. Name might be taken.' }
  }

  // Handle member edits
  for (const member of payload.members) {
    if (member.id) {
      await supabase
        .from('members')
        .update({ name: member.name.trim(), is_leader: member.is_leader })
        .eq('id', member.id)
    } else if (member.name.trim()) {
      await supabase.from('members').insert({
        team_id: payload.teamId,
        name: member.name.trim(),
        is_leader: member.is_leader,
      })
    }
  }

  try {
    if (payload.roomToken) revalidatePath(`/facilitator/${payload.roomToken}`)
  } catch {}
  return { success: true }
}

export async function deleteTeam(teamId: string, roomToken: string) {
  const supabase = createAdminClient()

  const { error } = await supabase.from('teams').delete().eq('id', teamId)

  if (error) {
    return { success: false, error: 'Failed to delete team.' }
  }

  try {
    if (roomToken) revalidatePath(`/facilitator/${roomToken}`)
  } catch {}
  return { success: true }
}

export async function resetMemberSession(memberId: string, roomToken: string) {
  const supabase = createAdminClient()

  const { error } = await supabase.from('sessions').delete().eq('member_id', memberId)

  if (error) {
    return { success: false, error: 'Failed to reset member session.' }
  }

  try {
    if (roomToken) revalidatePath(`/facilitator/${roomToken}`)
  } catch {}
  return { success: true }
}
