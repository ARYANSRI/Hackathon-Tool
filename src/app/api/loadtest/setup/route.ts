import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateTeamCode } from '@/lib/utils/code'

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient()

    // 1. Ensure Event
    let { data: event } = await supabase.from('events').select('id').limit(1).maybeSingle()
    if (!event) {
      const { data: newEv, error: evErr } = await supabase
        .from('events')
        .insert({ name: 'Live Load Test Event 2026', status: 'live' })
        .select()
        .single()

      if (evErr || !newEv) return NextResponse.json({ success: false, error: evErr?.message }, { status: 500 })
      event = newEv
    }

    if (!event) return NextResponse.json({ success: false, error: 'Failed to create or fetch event' }, { status: 500 })

    // 2. Insert 10 Rooms
    const roomRecords = Array.from({ length: 10 }, (_, i) => {
      const num = i + 1
      const token = `room-${num < 10 ? '0' + num : num}`
      return {
        event_id: event!.id,
        name: `Lab Room ${num < 10 ? '0' + num : num}`,
        registration_token: token,
        registration_open: true,
      }
    })

    await supabase.from('rooms').upsert(roomRecords, { onConflict: 'registration_token' })
    const { data: fetchedRooms } = await supabase.from('rooms').select('id, name, registration_token').eq('event_id', event.id)

    // 3. Insert 100 Teams
    const teamRecords = []
    for (let r = 0; r < fetchedRooms!.length; r++) {
      const room = fetchedRooms![r]
      for (let t = 0; t < 10; t++) {
        const teamCode = generateTeamCode(6)
        teamRecords.push({
          room_id: room.id,
          name: `LoadTeam R${r + 1}-T${t + 1}`,
          code: teamCode,
        })
      }
    }

    const { data: insertedTeams } = await supabase
      .from('teams')
      .upsert(teamRecords, { onConflict: 'name' })
      .select('id, name, code, room_id')

    // 4. Insert 1000 Members
    const memberRecords = []
    for (const team of insertedTeams!) {
      for (let m = 0; m < 10; m++) {
        memberRecords.push({
          team_id: team.id,
          name: `${team.name} User-${m + 1}`,
          is_leader: m === 0,
        })
      }
    }

    // Insert members in batches of 200
    const chunkSize = 200
    const insertedMembers: any[] = []
    for (let i = 0; i < memberRecords.length; i += chunkSize) {
      const chunk = memberRecords.slice(i, i + chunkSize)
      const { data: batch } = await supabase.from('members').insert(chunk).select('id, team_id, name')
      if (batch) insertedMembers.push(...batch)
    }

    // 5. Insert Round 1 Quiz & 12 Questions
    let { data: quizRound } = await supabase.from('rounds').select('id').eq('type', 'quiz').maybeSingle()
    if (!quizRound) {
      const { data: newR } = await supabase
        .from('rounds')
        .insert({ event_id: event.id, order: 1, type: 'quiz', status: 'live' })
        .select()
        .single()
      quizRound = newR
    }

    if (!quizRound) return NextResponse.json({ success: false, error: 'Failed to create quiz round' }, { status: 500 })

    const questionsBatch = Array.from({ length: 12 }, (_, i) => ({
      round_id: quizRound!.id,
      order: i + 1,
      text: `Live Load Test Question #${i + 1}`,
      options: [`Option A`, `Option B`, `Option C`, `Option D`],
      correct_index: 0,
      time_limit: 20,
    }))

    const { data: insertedQuestions } = await supabase
      .from('questions')
      .upsert(questionsBatch, { onConflict: 'id' })
      .select('id, order, time_limit')

    return NextResponse.json({
      success: true,
      eventId: event.id,
      quizRoundId: quizRound.id,
      roomsCount: fetchedRooms?.length || 0,
      teamsCount: insertedTeams?.length || 0,
      membersCount: insertedMembers.length,
      questions: insertedQuestions || [],
      teams: insertedTeams || [],
      members: insertedMembers,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
