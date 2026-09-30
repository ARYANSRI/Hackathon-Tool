'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getParticipantSession } from '@/app/actions/login'
import { getActiveQuizState, submitQuestionAnswer, getMemberAnswerForRun, closeQuestionRun } from '@/app/actions/quiz'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, Clock, Loader2, Sparkles, Trophy, Users, ShieldAlert, Award, ArrowRight } from 'lucide-react'
import ParticipantNav from '@/components/ParticipantNav'

const OPTION_STYLES = [
  { bg: 'bg-rose-600 hover:bg-rose-500 border-rose-400', label: 'A', symbol: '▲' },
  { bg: 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400', label: 'B', symbol: '◆' },
  { bg: 'bg-amber-600 hover:bg-amber-500 border-amber-400', label: 'C', symbol: '●' },
  { bg: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400', label: 'D', symbol: '■' },
]

export default function QuizArenaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [session, setSession] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  // Active Quiz State
  const [activeRun, setActiveRun] = useState<any | null>(null)
  const [submittedOption, setSubmittedOption] = useState<number | null>(null)
  const [pointsEarned, setPointsEarned] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Timer State
  const [timeLeft, setTimeLeft] = useState<number>(20)
  const [serverOffsetMs, setServerOffsetMs] = useState(0)

  // Load Session & Initial State
  useEffect(() => {
    async function init() {
      const sess = await getParticipantSession()
      if (!sess) {
        router.push('/login')
        return
      }
      setSession(sess)
      await fetchQuizState(sess.memberId)
      setLoading(false)
    }

    init()
  }, [router])

  // Fetch Quiz State
  const fetchQuizState = async (memberId: string) => {
    const res = await getActiveQuizState()
    if (res.success && res.activeRun) {
      const run = res.activeRun
      const serverNow = new Date(run.serverTime).getTime()
      setServerOffsetMs(serverNow - Date.now())
      setActiveRun(run)

      // Check if member already answered this run
      const answerCheck = await getMemberAnswerForRun(run.id, memberId)
      if (answerCheck.submitted) {
        setSubmittedOption(answerCheck.option ?? null)
        setPointsEarned(answerCheck.points ?? null)
      } else {
        setSubmittedOption(null)
        setPointsEarned(null)
      }
    } else {
      setActiveRun(null)
    }
  }

  // Supabase Realtime Listener for Instant Push Updates
  useEffect(() => {
    if (!session) return

    const channel = supabase
      .channel('quiz-events')
      .on('broadcast', { event: 'question-update' }, () => {
        fetchQuizState(session.memberId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'question_runs' }, () => {
        fetchQuizState(session.memberId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, () => {
        fetchQuizState(session.memberId)
      })
      .subscribe()

    // Polling fallback every 2s
    const pollInterval = setInterval(() => {
      fetchQuizState(session.memberId)
    }, 2000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [session])

  // Timer Countdown Logic
  useEffect(() => {
    if (!activeRun || activeRun.isClosed || !activeRun.startedAt) return

    const timeLimit = activeRun.question?.timeLimit || 20

    const timer = setInterval(() => {
      const startedAtMs = new Date(activeRun.startedAt).getTime()
      const nowSynced = Date.now() + serverOffsetMs
      const elapsedSeconds = Math.max(0, (nowSynced - startedAtMs) / 1000)
      const remaining = Math.max(0, timeLimit - elapsedSeconds)

      setTimeLeft(Math.ceil(remaining))

      // Auto-trigger close on client side if time expired and admin hasn't closed yet
      if (remaining <= 0 && !activeRun.isClosed) {
        closeQuestionRun(activeRun.id)
      }
    }, 200)

    return () => clearInterval(timer)
  }, [activeRun, serverOffsetMs])

  const handleSelectOption = async (optionIndex: number) => {
    if (submittedOption !== null || submitting || activeRun?.isClosed) return

    setSubmitting(true)
    setErrorMsg(null)

    const res = await submitQuestionAnswer({
      questionRunId: activeRun.id,
      memberId: session.memberId,
      teamId: session.teamId,
      option: optionIndex,
    })

    setSubmitting(false)

    if (res.success) {
      setSubmittedOption(optionIndex)
      setPointsEarned(res.points ?? null)
    } else {
      setErrorMsg(res.error || 'Failed to submit answer.')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </main>
    )
  }

  // No active question
  if (!activeRun) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <ParticipantNav currentPath="quiz" />
        <main className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-6">
          <div className="w-20 h-20 bg-indigo-600/20 border border-indigo-500/40 rounded-full flex items-center justify-center">
            <Clock className="w-10 h-10 text-indigo-400 animate-pulse" />
          </div>
          <div className="space-y-2 max-w-sm">
            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-300 text-xs font-bold rounded-full border border-indigo-500/20">
              {session?.teamName} &bull; {session?.roomName}
            </span>
            <h2 className="text-3xl font-black text-slate-100">Waiting for Question</h2>
            <p className="text-slate-400 text-sm">The quiz master will project the next question shortly. Get ready!</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-slate-900 border border-slate-800 text-slate-300 text-sm font-bold rounded-xl"
          >
            Back to Dashboard
          </button>
        </main>
      </div>
    )
  }

  const { question, isClosed } = activeRun
  const options: string[] = Array.isArray(question?.options) ? question.options : []
  const timeLimit = question?.timeLimit || 20
  const progressPercent = Math.min(100, Math.max(0, (timeLeft / timeLimit) * 100))

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <ParticipantNav currentPath="quiz" />
      <main className="flex-1 flex flex-col justify-between py-6 px-4 sm:px-6 max-w-2xl mx-auto w-full space-y-6">
      
      {/* Top Header & Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-indigo-600/20 text-indigo-300 font-extrabold text-xs rounded-full border border-indigo-500/30">
              Q{question?.order}
            </span>
            <span className="text-xs text-slate-400 font-bold truncate">{session?.teamName}</span>
          </div>

          {/* Time Limit Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-indigo-400 font-mono font-black text-sm">
            <Clock className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Animated Timer Progress Bar */}
        {!isClosed && (
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-linear ${
                progressPercent > 50 ? 'bg-indigo-500' : progressPercent > 20 ? 'bg-amber-400' : 'bg-rose-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* QUESTION DISPLAY */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl relative overflow-hidden">
        <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-black block">Question #{question?.order}</span>
        <h1 className="text-xl sm:text-2xl font-black text-slate-100 leading-snug">{question?.text}</h1>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-300 text-xs text-center font-bold">
          {errorMsg}
        </div>
      )}

      {/* LIVE ANSWER OPTION CARDS (Before Question Closes) */}
      {!isClosed ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((optText, idx) => {
              const style = OPTION_STYLES[idx % 4]
              const isSelected = submittedOption === idx

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={submittedOption !== null || submitting}
                  className={`w-full p-5 rounded-2xl text-left font-bold text-white transition-all transform active:scale-95 shadow-xl border-2 flex items-center space-x-4 ${style.bg} ${
                    isSelected ? 'ring-4 ring-white scale-102 shadow-2xl' : submittedOption !== null ? 'opacity-40 grayscale-[40%]' : ''
                  }`}
                >
                  <div className="w-10 h-10 bg-black/20 rounded-xl flex items-center justify-center font-black text-lg shrink-0">
                    {style.symbol}
                  </div>
                  <span className="text-base sm:text-lg leading-tight flex-1">{optText}</span>
                  {isSelected && <CheckCircle2 className="w-6 h-6 text-white shrink-0" />}
                </button>
              )
            })}
          </div>

          {/* Submission Status Notice */}
          {submittedOption !== null && (
            <div className="bg-indigo-600/20 border border-indigo-500/40 rounded-2xl p-4 text-center space-y-1 animate-in fade-in">
              <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider block">Answer Recorded!</span>
              <p className="text-xs text-slate-400">Waiting for question timer to end to reveal results...</p>
            </div>
          )}
        </div>
      ) : (
        /* BETWEEN-QUESTION REVEAL SCREEN (When Question Closes) */
        <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in duration-300">
          
          <div className="space-y-2">
            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20">
              Question Closed &bull; Results
            </span>
            <h2 className="text-2xl font-black text-slate-100">Correct Answer:</h2>
            <div className="bg-emerald-500/20 border-2 border-emerald-500 text-emerald-300 rounded-2xl p-4 text-lg font-black inline-block px-8 shadow-lg">
              {options[question?.correctIndex ?? 0] || 'Correct Option'}
            </div>
          </div>

          {/* Member Personal Result Card */}
          {submittedOption !== null ? (
            submittedOption === question?.correctIndex ? (
              <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-2xl p-6 text-center space-y-2 shadow-inner">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                  <Trophy className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-black text-emerald-400">CORRECT!</h3>
                <p className="text-3xl font-black text-slate-100">+{pointsEarned || 0} <span className="text-xs text-emerald-400 font-bold uppercase">Points</span></p>
              </div>
            ) : (
              <div className="bg-rose-500/10 border border-rose-500/40 rounded-2xl p-6 text-center space-y-2">
                <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto border border-rose-500/40">
                  <XCircle className="w-6 h-6 text-rose-400" />
                </div>
                <h3 className="text-xl font-black text-rose-400">INCORRECT</h3>
                <p className="text-sm text-slate-400">+0 Points earned</p>
              </div>
            )
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-sm">
              You did not submit an answer in time (+0 Points).
            </div>
          )}

          <p className="text-xs text-slate-400 animate-pulse">
            Next question will begin shortly when launched by quiz master...
          </p>
        </div>
      )}

      <footer className="text-center text-xs text-slate-600">
        Team Score = Highest scoring correct answer from any member.
      </footer>

    </main>
    </div>
  )
}
