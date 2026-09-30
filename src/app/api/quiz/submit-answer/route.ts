import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateMemberPoints } from '@/lib/utils/scoring'

export async function POST(request: Request) {
  const reqStart = Date.now()
  try {
    const body = await request.json()
    const { questionRunId, memberId, teamId, option } = body

    if (!questionRunId || !memberId || !teamId || option === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required parameters.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const receivedAtDate = new Date()

    // 1. Fetch Question Run & Question info
    const { data: run, error: runErr } = await supabase
      .from('question_runs')
      .select(`
        id,
        started_at,
        closed_at,
        questions (
          id,
          correct_index,
          time_limit
        )
      `)
      .eq('id', questionRunId)
      .single()

    if (runErr || !run) {
      return NextResponse.json({ success: false, error: 'Question run not found or inactive.' }, { status: 404 })
    }

    if (run.closed_at) {
      return NextResponse.json({ success: false, error: 'Question is closed.' }, { status: 400 })
    }

    const question = run.questions as any
    const startedAtMs = new Date(run.started_at).getTime()
    const receivedAtMs = receivedAtDate.getTime()
    const elapsedSeconds = (receivedAtMs - startedAtMs) / 1000
    const timeLimit = question.time_limit || 20

    if (elapsedSeconds > timeLimit + 2) {
      return NextResponse.json({ success: false, error: 'Time limit exceeded.' }, { status: 400 })
    }

    const isCorrect = option === question.correct_index
    const points = calculateMemberPoints({
      isCorrect,
      timeLimitSeconds: timeLimit,
      elapsedSeconds,
    })

    // 2. Real DB Answer Insert
    const { error: insertErr } = await supabase.from('answers').insert({
      question_run_id: questionRunId,
      member_id: memberId,
      team_id: teamId,
      option,
      received_at: receivedAtDate.toISOString(),
      points,
    })

    const latencyMs = Date.now() - reqStart

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json({ success: false, error: 'Already submitted.', latencyMs }, { status: 409 })
      }
      return NextResponse.json({ success: false, error: insertErr.message, latencyMs }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      points,
      isCorrect,
      option,
      latencyMs,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, latencyMs: Date.now() - reqStart }, { status: 500 })
  }
}
