'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Get full event overview data
export async function getAdminOverviewData() {
  const supabase = createAdminClient()

  // 1. Get main event
  let { data: event } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!event) {
    // Create default event if none exists
    const { data: newEvent } = await supabase
      .from('events')
      .insert({ name: 'College Hackathon 2026', status: 'upcoming' })
      .select()
      .single()
    event = newEvent
  }

  if (!event) {
    return { success: false, error: 'Failed to initialize event.' }
  }

  // 2. Fetch Rooms with team count
  const { data: rooms } = await supabase
    .from('rooms')
    .select(`
      id,
      name,
      registration_token,
      registration_open,
      teams (id, code, name)
    `)
    .eq('event_id', event.id)
    .order('name', { ascending: true })

  // 3. Fetch Rounds
  const { data: rounds } = await supabase
    .from('rounds')
    .select('*')
    .eq('event_id', event.id)
    .order('order', { ascending: true })

  // 4. Fetch Submissions count
  const { count: submissionCount } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })

  // 5. Fetch Active Sessions count
  const { count: sessionCount } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })

  const totalTeams = rooms ? rooms.reduce((acc, r) => acc + (r.teams?.length || 0), 0) : 0

  return {
    success: true,
    event,
    rooms: rooms || [],
    rounds: rounds || [],
    stats: {
      totalRooms: rooms?.length || 0,
      totalTeams,
      activeSessions: sessionCount || 0,
      totalSubmissions: submissionCount || 0,
      serverTime: new Date().toISOString(),
    },
  }
}

// Create or update rounds (Quiz & Build)
export async function ensureDefaultRounds(eventId: string) {
  const supabase = createAdminClient()

  const { data: existingRounds } = await supabase
    .from('rounds')
    .select('id, type')
    .eq('event_id', eventId)

  if (!existingRounds || existingRounds.length === 0) {
    // Insert Round 1 (Quiz) & Round 2 (Build)
    await supabase.from('rounds').insert([
      {
        event_id: eventId,
        order: 1,
        type: 'quiz',
        status: 'upcoming',
        config: { title: 'Round 1: Speed Quiz', total_questions: 12 },
      },
      {
        event_id: eventId,
        order: 2,
        type: 'build',
        status: 'upcoming',
        config: { title: 'Round 2: Build & Submit', problem_statement: 'Build an innovative web or mobile application.' },
      },
    ])
  }

  try { revalidatePath('/admin') } catch {}
  return { success: true }
}

// Update Round Status & Timestamps
export async function updateRoundStatus(payload: {
  roundId: string
  status: 'upcoming' | 'live' | 'ended'
  startsAt?: string | null
  endsAt?: string | null
}) {
  const supabase = createAdminClient()

  const updateData: any = { status: payload.status }
  if (payload.startsAt !== undefined) updateData.starts_at = payload.startsAt
  if (payload.endsAt !== undefined) updateData.ends_at = payload.endsAt

  const { error } = await supabase
    .from('rounds')
    .update(updateData)
    .eq('id', payload.roundId)

  if (error) {
    return { success: false, error: 'Failed to update round status.' }
  }

  try {
    revalidatePath('/admin')
    revalidatePath('/dashboard')
  } catch {}
  return { success: true }
}

// Questions Management for Quiz Round
export async function getRoundQuestions(roundId: string) {
  const supabase = createAdminClient()
  const { data: questions, error } = await supabase
    .from('questions')
    .select('*')
    .eq('round_id', roundId)
    .order('order', { ascending: true })

  if (error) return { success: false, error: 'Failed to fetch questions.' }
  return { success: true, questions: questions || [] }
}

export async function addOrUpdateQuestion(payload: {
  id?: string
  roundId: string
  order: number
  text: string
  options: string[]
  correctIndex: number
  timeLimit: number
}) {
  const supabase = createAdminClient()

  const questionData = {
    round_id: payload.roundId,
    order: payload.order,
    text: payload.text.trim(),
    options: payload.options.map(o => o.trim()),
    correct_index: payload.correctIndex,
    time_limit: payload.timeLimit,
  }

  let error
  if (payload.id) {
    const res = await supabase.from('questions').update(questionData).eq('id', payload.id)
    error = res.error
  } else {
    const res = await supabase.from('questions').insert(questionData)
    error = res.error
  }

  if (error) {
    console.error('Save question error:', error)
    return { success: false, error: 'Failed to save question.' }
  }

  try { revalidatePath('/admin') } catch {}
  return { success: true }
}

export async function deleteQuestion(questionId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('questions').delete().eq('id', questionId)
  if (error) return { success: false, error: 'Failed to delete question.' }
  try { revalidatePath('/admin') } catch {}
  return { success: true }
}

// CSV Question Import
export async function importQuestionsFromCSV(roundId: string, csvContent: string) {
  const supabase = createAdminClient()

  try {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0)
    if (lines.length === 0) return { success: false, error: 'CSV file is empty.' }

    // Header check
    const startIndex = lines[0].toLowerCase().includes('text') || lines[0].toLowerCase().includes('option') ? 1 : 0

    const questionsToInsert = []
    let orderCounter = 1

    for (let i = startIndex; i < lines.length; i++) {
      // Basic CSV splitter respecting simple quotes or commas
      const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''))
      
      // Expected columns: order (optional), text, option1, option2, option3, option4, correct_index (0-3), time_limit (optional, default 20)
      if (cols.length < 5) continue

      let order = parseInt(cols[0], 10)
      let textIndex = 0

      if (isNaN(order)) {
        order = orderCounter++
      } else {
        textIndex = 1
        orderCounter = Math.max(orderCounter, order + 1)
      }

      const text = cols[textIndex]
      const options = [cols[textIndex + 1], cols[textIndex + 2], cols[textIndex + 3], cols[textIndex + 4]]
      const correctIndex = parseInt(cols[textIndex + 5] || '0', 10)
      const timeLimit = parseInt(cols[textIndex + 6] || '20', 10)

      if (!text || options.some(o => !o)) continue

      questionsToInsert.push({
        round_id: roundId,
        order,
        text,
        options,
        correct_index: isNaN(correctIndex) ? 0 : Math.min(Math.max(correctIndex, 0), 3),
        time_limit: isNaN(timeLimit) ? 20 : timeLimit,
      })
    }

    if (questionsToInsert.length === 0) {
      return { success: false, error: 'No valid question rows found in CSV.' }
    }

    const { error } = await supabase.from('questions').insert(questionsToInsert)

    if (error) {
      console.error('Import questions error:', error)
      return { success: false, error: 'Failed to insert CSV questions into database.' }
    }

    try { revalidatePath('/admin') } catch {}
    return { success: true, count: questionsToInsert.length }
  } catch (err: any) {
    return { success: false, error: err.message || 'Invalid CSV format.' }
  }
}

// Export CSV Utilities
export async function exportTeamsCSV() {
  const supabase = createAdminClient()
  const { data: teams } = await supabase
    .from('teams')
    .select(`
      code,
      name,
      rooms (name),
      members (name, is_leader)
    `)
    .order('name', { ascending: true })

  if (!teams || teams.length === 0) return ''

  let csv = 'Room,Team Name,Team Code,Leader Name,Members\n'
  for (const t of teams) {
    const roomName = (t.rooms as any)?.name || 'Unassigned'
    const leader = t.members?.find((m: any) => m.is_leader)?.name || 'N/A'
    const otherMembers = t.members?.filter((m: any) => !m.is_leader).map((m: any) => m.name).join('; ') || ''

    csv += `"${roomName}","${t.name}","${t.code}","${leader}","${otherMembers}"\n`
  }

  return csv
}
