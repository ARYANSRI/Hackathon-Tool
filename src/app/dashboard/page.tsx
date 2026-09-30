'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getParticipantSession, logoutParticipant } from '@/app/actions/login'
import { getAdminOverviewData } from '@/app/actions/admin'
import { Users, Crown, LogOut, Clock, Loader2, Sparkles, ShieldCheck, Play, ArrowRight } from 'lucide-react'

import ParticipantNav from '@/components/ParticipantNav'

export default function DashboardPage() {
  const router = useRouter()
  const [session, setSession] = useState<{
    memberId: string
    memberName: string
    isLeader: boolean
    teamId: string
    teamName: string
    roomId: string
    roomName: string
  } | null>(null)

  const [loading, setLoading] = useState(true)
  const [activeRound, setActiveRound] = useState<any | null>(null)
  
  // Server-Synced Countdown State
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null)
  const [serverOffsetMs, setServerOffsetMs] = useState(0)

  useEffect(() => {
    async function loadSessionAndRound() {
      const sess = await getParticipantSession()
      if (!sess) {
        router.push('/login')
        return
      }
      setSession(sess)

      // Fetch active rounds and calculate server time offset
      const overview = await getAdminOverviewData()
      if (overview.success && overview.stats && overview.rounds) {
        const serverNow = new Date(overview.stats.serverTime).getTime()
        const clientNow = Date.now()
        const offset = serverNow - clientNow
        setServerOffsetMs(offset)

        const liveOrUpcomingRound = overview.rounds.find(
          (r: any) => r.status === 'live' || r.status === 'upcoming'
        )
        setActiveRound(liveOrUpcomingRound || null)
      }

      setLoading(false)
    }

    loadSessionAndRound()

    // Poll for status update every 3 seconds
    const interval = setInterval(loadSessionAndRound, 3000)
    return () => clearInterval(interval)
  }, [router])

  // Server-synced countdown timer loop
  useEffect(() => {
    if (!activeRound?.starts_at || activeRound.status !== 'upcoming') {
      setCountdownSeconds(null)
      return
    }

    const timer = setInterval(() => {
      const targetTime = new Date(activeRound.starts_at).getTime()
      const nowSynced = Date.now() + serverOffsetMs
      const remainingMs = Math.max(0, targetTime - nowSynced)
      const secondsLeft = Math.floor(remainingMs / 1000)

      setCountdownSeconds(secondsLeft)
    }, 500)

    return () => clearInterval(timer)
  }, [activeRound, serverOffsetMs])

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const s = secs % 60
    return `${mins < 10 ? '0' + mins : mins}:${s < 10 ? '0' + s : s}`
  }

  const handleLogout = async () => {
    await logoutParticipant()
    router.push('/login')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <ParticipantNav currentPath="dashboard" />
      <main className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        
        {/* Top Member Navbar Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600/20 border border-indigo-500/40 rounded-2xl flex items-center justify-center text-indigo-400 font-bold text-lg">
                {session?.memberName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center space-x-1.5">
                  <span>{session?.memberName}</span>
                  {session?.isLeader && (
                    <Crown className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                  )}
                </h2>
                <span className="text-xs text-indigo-400 font-semibold">{session?.roomName}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Registered Team</span>
              <h3 className="text-lg font-black text-slate-100">{session?.teamName}</h3>
            </div>
            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs font-mono font-bold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Online</span>
            </div>
          </div>
        </div>

        {/* Live Round / Countdown Display */}
        {activeRound?.status === 'live' ? (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Play className="w-8 h-8 text-emerald-400 fill-emerald-400" />
            </div>

            <div className="space-y-2">
              <span className="px-3.5 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-black rounded-full border border-emerald-500/40 uppercase tracking-wider">
                {activeRound.type === 'quiz' ? 'Round 1: Quiz LIVE' : 'Round 2: Build LIVE'}
              </span>
              <h2 className="text-3xl font-black text-slate-100">
                {activeRound.config?.title || 'Round in Progress!'}
              </h2>
              <p className="text-slate-300 text-sm">Get ready to participate!</p>
            </div>

            <button
              onClick={() => router.push(activeRound.type === 'quiz' ? '/quiz' : '/build')}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-500/30 transition flex items-center justify-center space-x-2 text-base"
            >
              <span>Enter {activeRound.type === 'quiz' ? 'Quiz Arena' : 'Build Submissions'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/30 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-300 text-xs font-bold rounded-full border border-indigo-500/20 inline-flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Round Standby</span>
              </span>
              <h2 className="text-2xl font-black text-slate-100">Waiting for Next Round</h2>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
                Please keep this screen open. When your facilitator or admin starts the round, your screen will automatically update.
              </p>
            </div>

            {/* Server Synced Countdown */}
            {countdownSeconds !== null && (
              <div className="bg-slate-950 border border-indigo-500/40 rounded-2xl p-6 space-y-2 shadow-inner">
                <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider block">Starts In</span>
                <div className="text-5xl font-mono font-black text-indigo-300 tracking-wider">
                  {formatCountdown(countdownSeconds)}
                </div>
              </div>
            )}

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-1 text-left">
              <div className="font-bold text-slate-300 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Important Reminders:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pt-1">
                <li>Ensure your device remains connected to the lab Wi-Fi.</li>
                <li>Each question has a 20s time limit.</li>
                <li>The fastest correct answer from any team member counts for your team!</li>
              </ul>
            </div>
          </div>
        )}

      </div>
    </main>
    </div>
  )
}
