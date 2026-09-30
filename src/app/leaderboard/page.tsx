'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getParticipantSession } from '@/app/actions/login'
import { getLeaderboardFromCache, recomputeLeaderboardCache } from '@/app/actions/leaderboard'
import { TeamLeaderboardItem } from '@/lib/utils/leaderboard'
import { Trophy, Users, ShieldAlert, ChevronDown, ChevronUp, Crown, Building2, RefreshCw, EyeOff, Snowflake, Loader2, Sparkles, ArrowLeft } from 'lucide-react'
import ParticipantNav from '@/components/ParticipantNav'

export default function LeaderboardPage() {
  const router = useRouter()

  const [session, setSession] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  // Tab State: 'room' (default) or 'global'
  const [activeTab, setActiveTab] = useState<'room' | 'global'>('room')

  // Data State
  const [leaderboard, setLeaderboard] = useState<TeamLeaderboardItem[]>([])
  const [visible, setVisible] = useState(true)
  const [frozen, setFrozen] = useState(false)
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const sess = await getParticipantSession()
      setSession(sess || null)
      await fetchLeaderboard(sess?.roomId, activeTab)
      setLoading(false)
    }

    init()
  }, [])

  useEffect(() => {
    fetchLeaderboard(session?.roomId, activeTab)
  }, [activeTab, session])

  const fetchLeaderboard = async (roomId?: string, tab: 'room' | 'global' = 'room') => {
    // Proactively trigger recompute on fetch to ensure fresh cache
    await recomputeLeaderboardCache()

    const res = await getLeaderboardFromCache({
      scope: tab,
      roomId: tab === 'room' ? roomId : undefined,
    })

    if (res.success) {
      setVisible(res.visible)
      setFrozen(res.frozen)
      setLeaderboard(res.leaderboard || [])
    }
  }

  const toggleExpandTeam = (teamId: string) => {
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId)
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
      <ParticipantNav currentPath="leaderboard" />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-6">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard')}
          className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => fetchLeaderboard(session?.roomId, activeTab)}
          className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl transition"
          title="Refresh Leaderboard"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-extrabold">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Live Hackathon Leaderboard</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight">
          Quiz <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-indigo-400">Standings</span>
        </h1>
        <p className="text-slate-400 text-sm">
          Teams are ranked by highest team question scores & total correct answers.
        </p>
      </div>

      {/* Admin Notice Banners */}
      {!visible && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center text-amber-300 text-sm font-bold flex items-center justify-center space-x-2">
          <EyeOff className="w-5 h-5 text-amber-400 shrink-0" />
          <span>Leaderboards are currently hidden by the quiz master for dramatic reveal!</span>
        </div>
      )}

      {frozen && visible && (
        <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4 text-center text-sky-300 text-sm font-bold flex items-center justify-center space-x-2">
          <Snowflake className="w-5 h-5 text-sky-400 shrink-0" />
          <span>Leaderboard is frozen at final question state.</span>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 flex items-center space-x-2">
        <button
          onClick={() => setActiveTab('room')}
          className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition flex items-center justify-center space-x-2 ${
            activeTab === 'room'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Room Tab ({session?.roomName || 'My Room'})</span>
        </button>

        <button
          onClick={() => setActiveTab('global')}
          className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition flex items-center justify-center space-x-2 ${
            activeTab === 'global'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Global Tab (All 10 Rooms)</span>
        </button>
      </div>

      {/* Leaderboard Table / Cards */}
      {visible ? (
        leaderboard.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 space-y-3">
            <Trophy className="w-12 h-12 text-slate-800 mx-auto" />
            <p className="text-base font-bold text-slate-400">No points scored yet.</p>
            <p className="text-xs text-slate-500">Leaderboard updates automatically as participants answer quiz questions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((team) => {
              const isExpanded = expandedTeamId === team.teamId
              const isCurrentMemberTeam = session?.teamId === team.teamId

              return (
                <div
                  key={team.teamId}
                  className={`bg-slate-900 border rounded-3xl overflow-hidden transition-all shadow-xl ${
                    isCurrentMemberTeam
                      ? 'border-indigo-500/60 bg-slate-900/90 ring-1 ring-indigo-500/40'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Team Summary Row */}
                  <button
                    onClick={() => toggleExpandTeam(team.teamId)}
                    className="w-full p-5 flex items-center justify-between text-left space-x-4 outline-none"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      
                      {/* Rank Badge */}
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border ${
                        team.rank === 1
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : team.rank === 2
                          ? 'bg-slate-300/20 text-slate-200 border-slate-300/40'
                          : team.rank === 3
                          ? 'bg-orange-600/20 text-orange-300 border-orange-500/40'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}>
                        {team.rank === 1 ? '🥇' : team.rank === 2 ? '🥈' : team.rank === 3 ? '🥉' : `#${team.rank}`}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-extrabold text-slate-100 text-base sm:text-lg truncate">
                            {team.teamName}
                          </h3>
                          {isCurrentMemberTeam && (
                            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-black rounded-md border border-indigo-500/30">
                              YOUR TEAM
                            </span>
                          )}
                        </div>

                        {/* Room Tag on Global View */}
                        {activeTab === 'global' && (
                          <span className="inline-block px-2.5 py-0.5 bg-slate-950 text-amber-400 border border-slate-800 text-[11px] font-bold rounded-md">
                            {team.roomName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 shrink-0">
                      <div className="text-right">
                        <span className="text-2xl font-black text-indigo-300 tracking-tight block">
                          {team.totalScore}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Points</span>
                      </div>

                      <div className="p-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>

                  {/* Expandable Member Points Breakdown */}
                  {isExpanded && (
                    <div className="bg-slate-950/80 border-t border-slate-800 p-5 space-y-3 animate-in fade-in duration-200">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                        Member Points Breakdown
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {team.members.map((m) => (
                          <div
                            key={m.id}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center space-x-2">
                              {m.isLeader ? (
                                <Crown className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                              )}
                              <span className={m.isLeader ? 'font-bold text-amber-200' : 'text-slate-300'}>
                                {m.name}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-indigo-300">
                              {m.personalPoints} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500">
          <EyeOff className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-300">Leaderboard Hidden</p>
        </div>
      )}

    </main>
    </div>
  )
}
