'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { calculateMemberPoints } from '@/lib/utils/scoring'
import { revalidatePath } from 'next/cache'

// Get current active quiz state (Masks correct_index if question is live!)
export async function getActiveQuizState() {
  const supabase = createAdminClient()

  // 1. Get live or latest question run
  const { data: activeRun } = await supabase
    .from('question_runs')
    .select(`
      id,
      question_id,
      started_at,
      closed_at,
      questions (
        id,
        round_id,
        order,
        text,
        options,
        time_limit,
        correct_index
      )
    `)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!activeRun) {
    return { success: true, activeRun: null }
  }

  const isClosed = activeRun.closed_at !== null
  const questionData = activeRun.questions as any

  // Mask correct_index if question is currently live/open!
  const sanitizedQuestion = {
    id: questionData?.id,
    roundId: questionData?.round_id,
    order: questionData?.order,
    text: questionData?.text,
    options: questionData?.options,
    timeLimit: questionData?.time_limit || 20,
    // SECURITY: Only return correct_index if question run is closed!
    correctIndex: isClosed ? questionData?.correct_index : null,
  }

  return {
    success: true,
    activeRun: {
      id: activeRun.id,
      questionId: activeRun.question_id,
      startedAt: activeRun.started_at,
      closedAt: activeRun.closed_at,
      isClosed,
      question: sanitizedQuestion,
      serverTime: new Date().toISOString(),
    },
  }
}

// Start Question Run (Admin Action)
export async function startQuestionRun(questionId: string) {
  const supabase = createAdminClient()

  // 1. Close any currently running questions
  await supabase
    .from('question_runs')
    .update({ closed_at: new Date().toISOString() })
    .is('closed_at', null)

  // 2. Insert new question run
  const { data: newRun, error } = await supabase
    .from('question_runs')
    .insert({
      question_id: questionId,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error || !newRun) {
    console.error('Error starting question run:', error)
    return { success: false, error: 'Failed to start question.' }
  }

  try {
    revalidatePath('/quiz')
    revalidatePath('/admin')
  } catch {}

  // Broadcast realtime event
  try {
    const channel = supabase.channel('quiz-events')
    await channel.subscribe()
    await channel.send({
      type: 'broadcast',
      event: 'question-update',
      payload: { action: 'start', questionId, runId: newRun.id },
    })
    supabase.removeChannel(channel)
  } catch (e) {
    console.error('Broadcast error:', e)
  }

  return { success: true, runId: newRun.id }
}

// Close Question Run (Admin Action / Auto Timeout)
export async function closeQuestionRun(questionRunId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('question_runs')
    .update({ closed_at: new Date().toISOString() })
    .eq('id', questionRunId)

  if (error) {
    return { success: false, error: 'Failed to close question.' }
  }

  try {
    revalidatePath('/quiz')
    revalidatePath('/admin')
  } catch {}

  // Broadcast realtime event
  try {
    const channel = supabase.channel('quiz-events')
    await channel.subscribe()
    await channel.send({
      type: 'broadcast',
      event: 'question-update',
      payload: { action: 'close', questionRunId },
    })
    supabase.removeChannel(channel)
  } catch (e) {
    console.error('Broadcast error:', e)
  }

  return { success: true }
}

// Submit Answer (Participant Action)
export async function submitQuestionAnswer(payload: {
  questionRunId: string
  memberId: string
  teamId: string
  option: number
}) {
  const supabase = createAdminClient()
  const receivedAtDate = new Date()
  const receivedAtStr = receivedAtDate.toISOString()

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
    .eq('id', payload.questionRunId)
    .single()

  if (runErr || !run) {
    return { success: false, error: 'Question is no longer active.' }
  }

  // Reject if already closed
  if (run.closed_at) {
    return { success: false, error: 'Time is up! Question is closed.' }
  }

  const question = run.questions as any
  const startedAtMs = new Date(run.started_at).getTime()
  const receivedAtMs = receivedAtDate.getTime()
  const elapsedSeconds = (receivedAtMs - startedAtMs) / 1000
  const timeLimit = question.time_limit || 20

  // Reject if answered well past time limit (allowing 2s grace for network latency)
  if (elapsedSeconds > timeLimit + 2) {
    return { success: false, error: 'Time limit exceeded.' }
  }

  const isCorrect = payload.option === question.correct_index
  const points = calculateMemberPoints({
    isCorrect,
    timeLimitSeconds: timeLimit,
    elapsedSeconds,
  })

  // 2. Insert into answers (Unique constraint handles double-submit)
  const { data: answer, error: insertErr } = await supabase
    .from('answers')
    .insert({
      question_run_id: payload.questionRunId,
      member_id: payload.memberId,
      team_id: payload.teamId,
      option: payload.option,
      received_at: receivedAtStr,
      points,
    })
    .select()
    .single()

  if (insertErr) {
    if (insertErr.code === '23505') {
      return { success: false, error: 'You have already submitted an answer for this question.' }
    }
    console.error('Answer insert error:', insertErr)
    return { success: false, error: 'Failed to record answer.' }
  }

  return {
    success: true,
    points,
    isCorrect,
    option: payload.option,
  }
}

// Advance to Next Question automatically in round
export async function advanceNextQuestion(roundId: string) {
  const supabase = createAdminClient()

  // 1. Fetch all questions for this round ordered by `order`
  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('id, order')
    .eq('round_id', roundId)
    .order('order', { ascending: true })

  if (qErr || !questions || questions.length === 0) {
    return { success: false, error: 'No questions found in this quiz round.' }
  }

  // 2. Fetch latest question run
  const { data: latestRun } = await supabase
    .from('question_runs')
    .select('id, question_id, closed_at')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let nextQuestion = questions[0] // Default to first question

  if (latestRun) {
    const currentIndex = questions.findIndex(q => q.id === latestRun.question_id)
    if (currentIndex !== -1 && currentIndex + 1 < questions.length) {
      nextQuestion = questions[currentIndex + 1]
    } else if (currentIndex + 1 >= questions.length) {
      // Quiz round completed! Close round status
      await supabase
        .from('rounds')
        .update({ status: 'ended', ends_at: new Date().toISOString() })
        .eq('id', roundId)

      try {
        const channel = supabase.channel('quiz-events')
        await channel.subscribe()
        await channel.send({
          type: 'broadcast',
          event: 'question-update',
          payload: { action: 'ended' },
        })
        supabase.removeChannel(channel)
      } catch (e) {}

      try { revalidatePath('/admin'); revalidatePath('/quiz') } catch {}
      return { success: true, completed: true, error: undefined, runId: undefined }
    }
  }

  // 3. Start the next question run
  const res = await startQuestionRun(nextQuestion.id)
  return { success: res.success, completed: false, error: res.error, runId: res.runId }
}

// Fetch member's answer for active question run
export async function getMemberAnswerForRun(questionRunId: string, memberId: string) {
  const supabase = createAdminClient()
  const { data: answer } = await supabase
    .from('answers')
    .select('id, option, points, received_at')
    .eq('question_run_id', questionRunId)
    .eq('member_id', memberId)
    .maybeSingle()

  return answer ? { submitted: true, option: answer.option, points: answer.points } : { submitted: false }
}
