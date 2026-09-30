import { createClient } from '@supabase/supabase-js'

// Environment & Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

const adminSupabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

interface LatencyRecord {
  type: 'login' | 'answer'
  latencyMs: number
  success: boolean
  status?: number
  error?: string
}

async function runRealLoadTest() {
  console.log('====================================================')
  console.log('🚀 REAL NETWORK LOAD TEST (1,000 USERS & REALTIME WS)')
  console.log(`Target Base URL: ${BASE_URL}`)
  console.log(`Supabase URL:    ${SUPABASE_URL}`)
  console.log('====================================================\n')

  const latencies: LatencyRecord[] = []
  let realtimeDisconnects = 0
  let realtimeReceivedEvents = 0
  let failedAnswersCount = 0

  const startTime = Date.now()

  try {
    // ----------------------------------------------------
    // STEP 1: HTTP SETUP SEED (10 Rooms, 100 Teams, 1000 Members)
    // ----------------------------------------------------
    console.log(`🔄 Step 1: Sending HTTP POST to ${BASE_URL}/api/loadtest/setup...`)
    const setupStart = Date.now()

    let setupRes
    try {
      const res = await fetch(`${BASE_URL}/api/loadtest/setup`, { method: 'POST' })
      setupRes = await res.json()
    } catch (e: any) {
      console.log(`⚠️ HTTP setup endpoint unavailable at ${BASE_URL}, running seed directly via Supabase Admin Client...`)
      // Direct DB setup fallback if Next.js dev server is starting up
      const { data: event } = await adminSupabase.from('events').select('id').limit(1).maybeSingle()
      let eventId = event?.id
      if (!eventId) {
        const { data: newEv } = await adminSupabase.from('events').insert({ name: 'Live Event 2026', status: 'live' }).select().single()
        eventId = newEv.id
      }

      const roomRecords = Array.from({ length: 10 }, (_, i) => ({
        event_id: eventId,
        name: `Lab Room ${i + 1 < 10 ? '0' + (i + 1) : i + 1}`,
        registration_token: `room-${i + 1 < 10 ? '0' + (i + 1) : i + 1}`,
        registration_open: true,
      }))
      await adminSupabase.from('rooms').upsert(roomRecords, { onConflict: 'registration_token' })
      const { data: rooms } = await adminSupabase.from('rooms').select('id')

      const teamRecords = []
      for (let r = 0; r < rooms!.length; r++) {
        for (let t = 0; t < 10; t++) {
          teamRecords.push({ room_id: rooms![r].id, name: `LoadTeam R${r + 1}-T${t + 1}`, code: `CODE${r}${t}` })
        }
      }
      const { data: teams } = await adminSupabase.from('teams').upsert(teamRecords, { onConflict: 'name' }).select('id, name, code')

      const memberRecords = []
      for (const team of teams!) {
        for (let m = 0; m < 10; m++) {
          memberRecords.push({ team_id: team.id, name: `${team.name} User-${m + 1}`, is_leader: m === 0 })
        }
      }

      const chunkSize = 200
      const insertedMembers: any[] = []
      for (let i = 0; i < memberRecords.length; i += chunkSize) {
        const chunk = memberRecords.slice(i, i + chunkSize)
        const { data: batch } = await adminSupabase.from('members').insert(chunk).select('id, team_id, name')
        if (batch) insertedMembers.push(...batch)
      }

      let { data: qRound } = await adminSupabase.from('rounds').select('id').eq('type', 'quiz').maybeSingle()
      if (!qRound) {
        const { data: newR } = await adminSupabase.from('rounds').insert({ event_id: eventId, order: 1, type: 'quiz', status: 'live' }).select().single()
        qRound = newR
      }

      if (!qRound) throw new Error('Failed to create quiz round in fallback seed')

      const qBatch = Array.from({ length: 12 }, (_, i) => ({
        round_id: qRound!.id,
        order: i + 1,
        text: `Live Load Test Question #${i + 1}`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_index: 0,
        time_limit: 20,
      }))
      const { data: questions } = await adminSupabase.from('questions').upsert(qBatch, { onConflict: 'id' }).select('id, order, time_limit')

      setupRes = { success: true, members: insertedMembers, questions, quizRoundId: qRound.id }
    }

    const { members, questions, quizRoundId } = setupRes
    console.log(`✅ Step 1 Complete: Setup finished in ${Date.now() - setupStart}ms (${members?.length || 0} members ready).\n`)

    // ----------------------------------------------------
    // STEP 2: REAL HTTP LOGIN REQUESTS (1,000 Concurrency)
    // ----------------------------------------------------
    console.log(`🔄 Step 2: Sending 1,000 REAL HTTP POST Requests to ${BASE_URL}/api/auth/login...`)
    const loginStart = Date.now()

    const loginBatches = []
    const batchSize = 100

    for (let i = 0; i < members.length; i += batchSize) {
      const chunk = members.slice(i, i + batchSize)
      const batchPromise = Promise.all(
        chunk.map(async (m: any) => {
          const reqTime = Date.now()
          try {
            const res = await fetch(`${BASE_URL}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ memberId: m.id, teamId: m.team_id, deviceToken: `dev_${m.id}` }),
            })
            const duration = Date.now() - reqTime
            latencies.push({ type: 'login', latencyMs: duration, success: res.ok, status: res.status })
          } catch (e: any) {
            const duration = Date.now() - reqTime
            latencies.push({ type: 'login', latencyMs: duration, success: false, error: e.message })
          }
        })
      )
      loginBatches.push(batchPromise)
    }

    await Promise.all(loginBatches)
    const loginTimeMs = Date.now() - loginStart
    console.log(`✅ Step 2 Complete: 1,000 HTTP Logins finished in ${loginTimeMs}ms.\n`)

    // ----------------------------------------------------
    // STEP 3: CONNECT 1,000 REAL SUPABASE REALTIME CLIENTS
    // ----------------------------------------------------
    console.log(`🔄 Step 3: Connecting 1,000 Real Supabase Realtime WebSocket Clients to channel 'quiz-events'...`)
    const wsStart = Date.now()

    const realtimeClients: any[] = []
    const wsConnectPromises = members.slice(0, 1000).map((m: any, idx: number) => {
      return new Promise<void>((resolve) => {
        const client = createClient(SUPABASE_URL, ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })

        // Match exact channel name 'quiz-events' used in src/app/quiz/page.tsx
        const channel = client.channel('quiz-events')
        channel
          .on('broadcast', { event: 'question-update' }, () => {
            realtimeReceivedEvents++
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'question_runs' }, () => {
            realtimeReceivedEvents++
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              realtimeClients.push(client)
              resolve()
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              realtimeDisconnects++
              resolve()
            }
          })

        // Safety timeout for WS connection
        setTimeout(() => resolve(), 3000)
      })
    })

    await Promise.all(wsConnectPromises)
    console.log(`✅ Step 3 Complete: Connected ${realtimeClients.length} Realtime WS clients in ${Date.now() - wsStart}ms.\n`)

    // Master publisher channel for sending broadcast updates
    const pubChannel = adminSupabase.channel('quiz-events')
    await pubChannel.subscribe()

    // ----------------------------------------------------
    // STEP 4: 12-QUESTION REAL HTTP QUIZ SUBMISSIONS
    // ----------------------------------------------------
    console.log(`🔄 Step 4: Simulating 12 Live Questions with 1,000 Real HTTP Answer Submissions...`)
    const answerStart = Date.now()

    for (let qIdx = 0; qIdx < questions.length; qIdx++) {
      const q = questions[qIdx]

      // Start question run on DB
      const { data: qRun } = await adminSupabase
        .from('question_runs')
        .insert({ question_id: q.id, started_at: new Date().toISOString() })
        .select('id')
        .single()

      if (!qRun) {
        console.error(`Failed to create question_run for question ${q.id}`)
        continue
      }

      // Broadcast Realtime Event over channel 'quiz-events'
      await pubChannel.send({
        type: 'broadcast',
        event: 'question-update',
        payload: { action: 'start', questionRunId: qRun.id },
      })
      await adminSupabase.from('question_runs').update({ started_at: new Date().toISOString() }).eq('id', qRun.id)

      // Submit 1,000 HTTP POST Requests
      const answerBatchSize = 100
      for (let i = 0; i < members.length; i += answerBatchSize) {
        const chunk = members.slice(i, i + answerBatchSize)
        await Promise.all(
          chunk.map(async (m: any) => {
            const reqTime = Date.now()
            const isCorrect = Math.random() > 0.3
            const option = isCorrect ? 0 : 1

            try {
              const res = await fetch(`${BASE_URL}/api/quiz/submit-answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionRunId: qRun.id, memberId: m.id, teamId: m.team_id, option }),
              })
              const duration = Date.now() - reqTime
              latencies.push({ type: 'answer', latencyMs: duration, success: res.ok, status: res.status })
              if (!res.ok) failedAnswersCount++
            } catch (e: any) {
              const duration = Date.now() - reqTime
              latencies.push({ type: 'answer', latencyMs: duration, success: false, error: e.message })
              failedAnswersCount++
            }
          })
        )
      }

      // Close Question Run
      await pubChannel.send({
        type: 'broadcast',
        event: 'question-update',
        payload: { action: 'close', questionRunId: qRun.id },
      })
      await adminSupabase.from('question_runs').update({ closed_at: new Date().toISOString() }).eq('id', qRun.id)
      process.stdout.write(` Question #${q.order}/12 completed over HTTP\r`)
    }

    console.log(`\n✅ Step 4 Complete: Finished 12 Questions in ${Date.now() - answerStart}ms.\n`)

    // Cleanup Realtime WS connections
    realtimeClients.forEach(c => c.removeAllChannels())

    // ----------------------------------------------------
    // STEP 5: CALCULATE REAL P50 / P95 LATENCY METRICS
    // ----------------------------------------------------
    const loginLatencies = latencies.filter(l => l.type === 'login').map(l => l.latencyMs).sort((a, b) => a - b)
    const answerLatencies = latencies.filter(l => l.type === 'answer').map(l => l.latencyMs).sort((a, b) => a - b)

    const calcPercentile = (arr: number[], pct: number) => {
      if (arr.length === 0) return 0
      const index = Math.floor((pct / 100) * arr.length)
      return arr[Math.min(index, arr.length - 1)]
    }

    const loginP50 = calcPercentile(loginLatencies, 50)
    const loginP95 = calcPercentile(loginLatencies, 95)
    const answerP50 = calcPercentile(answerLatencies, 50)
    const answerP95 = calcPercentile(answerLatencies, 95)

    const totalErrors = latencies.filter(l => !l.success).length

    console.log('====================================================')
    console.log('📊 REAL NETWORK LOAD TEST REPORT & LATENCY METRICS')
    console.log('====================================================')
    console.log(`🌐 Base URL Tested:             ${BASE_URL}`)
    console.log(`⏱ Total Real Test Duration:     ${((Date.now() - startTime) / 1000).toFixed(2)}s`)
    console.log(`🔑 HTTP Login Requests:        ${loginLatencies.length}`)
    console.log(`  • p50 Login Latency:         ${loginP50}ms`)
    console.log(`  • p95 Login Latency:         ${loginP95}ms`)
    console.log(`📝 HTTP Answer Requests:       ${answerLatencies.length}`)
    console.log(`  • p50 Answer Latency:        ${answerP50}ms`)
    console.log(`  • p95 Answer Latency:        ${answerP95}ms`)
    console.log(`📡 Connected Realtime WS:      ${realtimeClients.length} clients`)
    console.log(`⚡ Realtime Events Received:   ${realtimeReceivedEvents}`)
    console.log(`🔌 Realtime Disconnects:       ${realtimeDisconnects}`)
    console.log(`❌ Failed HTTP Requests:       ${totalErrors}`)
    console.log(`❌ Failed Answers:             ${failedAnswersCount}`)
    console.log('====================================================\n')

  } catch (err: any) {
    console.error('❌ Real Load Test Error:', err)
  }
}

runRealLoadTest()
