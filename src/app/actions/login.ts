'use server'

import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export async function verifyTeamCode(code: string) {
  const cleanCode = code.trim().toUpperCase()
  if (!cleanCode || cleanCode.length !== 6) {
    return { success: false, error: 'Please enter a valid 6-character team code.' }
  }

  const supabase = createAdminClient()

  // Find team by code
  const { data: team, error } = await supabase
    .from('teams')
    .select('id, name, code, room_id, rooms(name)')
    .eq('code', cleanCode)
    .maybeSingle()

  if (error || !team) {
    return { success: false, error: 'Team code not found. Please check your code or ask your room facilitator.' }
  }

  // Get members
  const { data: members, error: membersErr } = await supabase
    .from('members')
    .select('id, name, is_leader')
    .eq('team_id', team.id)
    .order('is_leader', { ascending: false })

  if (membersErr || !members || members.length === 0) {
    return { success: false, error: 'No members registered under this team code.' }
  }

  const roomData = team.rooms as unknown as { name: string } | null

  return {
    success: true,
    team: {
      id: team.id,
      name: team.name,
      code: team.code,
      roomId: team.room_id,
      roomName: roomData?.name || 'Assigned Room',
    },
    members,
  }
}

export async function loginMember(payload: {
  memberId: string
  teamId: string
  deviceToken: string
}) {
  const supabase = createAdminClient()

  // 1. Verify Member & Team
  const { data: member, error: memberErr } = await supabase
    .from('members')
    .select('id, name, is_leader, team_id, teams(name, room_id, rooms(name))')
    .eq('id', payload.memberId)
    .eq('team_id', payload.teamId)
    .single()

  if (memberErr || !member) {
    return { success: false, error: 'Member record not found.' }
  }

  const teamData = member.teams as unknown as {
    name: string
    room_id: string
    rooms: { name: string } | null
  } | null

  // 2. Manage Session (Replace earlier device session if member logs in again)
  const { data: existingSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('member_id', member.id)
    .maybeSingle()

  if (existingSession) {
    // Replace old session
    await supabase
      .from('sessions')
      .update({
        device_token: payload.deviceToken,
        last_seen: new Date().toISOString(),
      })
      .eq('id', existingSession.id)
  } else {
    // Insert new session
    await supabase.from('sessions').insert({
      member_id: member.id,
      device_token: payload.deviceToken,
      last_seen: new Date().toISOString(),
    })
  }

  // 3. Set Cookie Session
  const sessionData = {
    memberId: member.id,
    memberName: member.name,
    isLeader: member.is_leader,
    teamId: member.team_id,
    teamName: teamData?.name || 'Team',
    roomId: teamData?.room_id || '',
    roomName: teamData?.rooms?.name || 'Room',
    deviceToken: payload.deviceToken,
  }

  try {
    const cookieStore = await cookies()
    cookieStore.set('participant_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    })
  } catch (e) {
    // Graceful handling outside Next.js request scope (e.g. CLI audit scripts)
  }

  return { success: true, session: sessionData }
}

export async function getParticipantSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('participant_session')
  if (!sessionCookie || !sessionCookie.value) return null
  try {
    return JSON.parse(sessionCookie.value)
  } catch {
    return null
  }
}

export async function logoutParticipant() {
  const cookieStore = await cookies()
  cookieStore.delete('participant_session')
  return { success: true }
}
