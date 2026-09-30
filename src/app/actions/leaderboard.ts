'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { computeLeaderboardsPayload, TeamLeaderboardItem } from '@/lib/utils/leaderboard'
import { revalidatePath } from 'next/cache'

// Background Recomputation Function (Stores in leaderboard_cache)
export async function recomputeLeaderboardCache() {
  const supabase = createAdminClient()

  // 1. Fetch Teams, Members, Answers in PARALLEL
  const [teamsRes, membersRes, answersRes] = await Promise.all([
    supabase.from('teams').select('id, room_id, name, code, rooms(name)'),
    supabase.from('members').select('id, team_id, name, is_leader'),
    supabase.from('answers').select('id, question_run_id, member_id, team_id, option, points, received_at'),
  ])

  const teams = teamsRes.data
  const members = membersRes.data
  const answers = answersRes.data

  if (!teams || !members) return { success: false, error: 'No data to compute.' }

  const { globalLeaderboard, roomLeaderboards } = computeLeaderboardsPayload(
    teams,
    members,
    answers || []
  )

  const updatedAt = new Date().toISOString()

  // 4. Upsert Global Cache
  const { data: existingGlobal } = await supabase
    .from('leaderboard_cache')
    .select('id')
    .eq('scope', 'global')
    .maybeSingle()

  if (existingGlobal) {
    await supabase
      .from('leaderboard_cache')
      .update({ payload: globalLeaderboard as any, updated_at: updatedAt })
      .eq('id', existingGlobal.id)
  } else {
    await supabase.from('leaderboard_cache').insert({
      scope: 'global',
      payload: globalLeaderboard as any,
      updated_at: updatedAt,
    })
  }

  // 5. Upsert Per-Room Cache
  for (const roomId in roomLeaderboards) {
    const roomPayload = roomLeaderboards[roomId]
    const { data: existingRoom } = await supabase
      .from('leaderboard_cache')
      .select('id')
      .eq('scope', 'room')
      .eq('room_id', roomId)
      .maybeSingle()

    if (existingRoom) {
      await supabase
        .from('leaderboard_cache')
        .update({ payload: roomPayload as any, updated_at: updatedAt })
        .eq('id', existingRoom.id)
    } else {
      await supabase.from('leaderboard_cache').insert({
        scope: 'room',
        room_id: roomId,
        payload: roomPayload as any,
        updated_at: updatedAt,
      })
    }
  }

  try { revalidatePath('/leaderboard') } catch {}
  return { success: true, totalTeams: globalLeaderboard.length }
}

// Fetch Leaderboard from Cache (Fast, 0 recalculation on client request)
export async function getLeaderboardFromCache(payload: {
  scope: 'room' | 'global'
  roomId?: string
}) {
  const supabase = createAdminClient()

  // Get Admin Settings for Leaderboard visibility
  const { data: event } = await supabase
    .from('events')
    .select('config')
    .limit(1)
    .maybeSingle()

  const config = (event?.config as any) || {}
  const visible = config.leaderboard_visible !== false
  const frozen = config.leaderboard_frozen === true

  let query = supabase.from('leaderboard_cache').select('payload, updated_at').eq('scope', payload.scope)
  if (payload.scope === 'room' && payload.roomId) {
    query = query.eq('room_id', payload.roomId)
  }

  const { data: cacheRow } = await query.maybeSingle()

  const leaderboardData: TeamLeaderboardItem[] = (cacheRow?.payload as any) || []

  return {
    success: true,
    visible,
    frozen,
    updatedAt: cacheRow?.updated_at || new Date().toISOString(),
    leaderboard: leaderboardData,
  }
}

// Admin Toggle to Hide / Freeze Leaderboard
export async function toggleLeaderboardConfig(payload: {
  visible?: boolean
  frozen?: boolean
}) {
  const supabase = createAdminClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, config')
    .limit(1)
    .single()

  if (!event) return { success: false, error: 'Event not found.' }

  const currentConfig = (event.config as any) || {}
  const newConfig = {
    ...currentConfig,
    leaderboard_visible: payload.visible !== undefined ? payload.visible : currentConfig.leaderboard_visible,
    leaderboard_frozen: payload.frozen !== undefined ? payload.frozen : currentConfig.leaderboard_frozen,
  }

  const { error } = await supabase
    .from('events')
    .update({ config: newConfig })
    .eq('id', event.id)

  if (error) return { success: false, error: 'Failed to update settings.' }

  try {
    revalidatePath('/leaderboard')
    revalidatePath('/admin')
  } catch {}
  return { success: true, config: newConfig }
}
