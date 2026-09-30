'use client'

import { useState, useEffect, use } from 'react'
import { getLeaderboardFromCache, recomputeLeaderboardCache } from '@/app/actions/leaderboard'
import { getRoomByToken } from '@/app/actions/registration'
import { TeamLeaderboardItem } from '@/lib/utils/leaderboard'
import { Trophy, Building2, EyeOff, Snowflake } from 'lucide-react'

export default function RoomProjectorPage({ params }: { params: Promise<{ roomToken: string }> }) {
  const resolvedParams = use(params)
  const roomToken = resolvedParams.roomToken

  const [room, setRoom] = useState<any | null>(null)
  const [leaderboard, setLeaderboard] = useState<TeamLeaderboardItem[]>([])
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    async function loadRoomAndLeaderboard() {
      const roomRes = await getRoomByToken(roomToken)
      if (roomRes.success && roomRes.room) {
        setRoom(roomRes.room)
        await recomputeLeaderboardCache()
        const lbRes = await getLeaderboardFromCache({ scope: 'room', roomId: roomRes.room.id })
        if (lbRes.success) {
          setVisible(lbRes.visible)
          setLeaderboard(lbRes.leaderboard || [])
        }
      }
    }

    loadRoomAndLeaderboard()
    const interval = setInterval(loadRoomAndLeaderboard, 3000)
    return () => clearInterval(interval)
  }, [roomToken])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 sm:p-12 flex flex-col justify-between select-none">
      
      {/* Top Projector Banner */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-400 font-black text-2xl">
            🏆
          </div>
          <div>
            <span className="text-xs text-amber-400 font-extrabold uppercase tracking-widest block">Live Lab Room Leaderboard</span>
            <h1 className="text-4xl font-black text-slate-100 tracking-tight">{room?.name || 'Lab Room'}</h1>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 uppercase tracking-widest font-bold block">Updates Every 3s</span>
          <span className="text-sm font-mono text-emerald-400 font-extrabold flex items-center justify-end space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>LIVE SYNC</span>
          </span>
        </div>
      </div>

      {/* Leaderboard Cards */}
      {visible ? (
        <div className="my-8 space-y-4 max-w-5xl mx-auto w-full">
          {leaderboard.slice(0, 10).map((team) => (
            <div
              key={team.teamId}
              className={`p-6 rounded-3xl flex items-center justify-between transition-all border shadow-2xl ${
                team.rank === 1
                  ? 'bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border-amber-500/60 scale-102'
                  : team.rank === 2
                  ? 'bg-gradient-to-r from-slate-400/10 via-slate-900 to-slate-900 border-slate-400/40'
                  : team.rank === 3
                  ? 'bg-gradient-to-r from-orange-600/10 via-slate-900 to-slate-900 border-orange-500/40'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center space-x-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border ${
                  team.rank === 1
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : team.rank === 2
                    ? 'bg-slate-300 text-slate-950 border-slate-200'
                    : team.rank === 3
                    ? 'bg-orange-500 text-slate-950 border-orange-400'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}>
                  {team.rank}
                </div>

                <div className="space-y-1">
                  <h3 className="text-3xl font-black text-slate-100">{team.teamName}</h3>
                  <span className="text-xs text-slate-400 font-mono">Code: {team.teamCode}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-4xl font-mono font-black text-amber-300">{team.totalScore}</span>
                <span className="text-xs text-slate-400 uppercase font-bold block">Points</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="my-20 text-center space-y-4">
          <EyeOff className="w-16 h-16 text-amber-400 mx-auto" />
          <h2 className="text-3xl font-black text-slate-200">Leaderboard Hidden</h2>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 border-t border-slate-800/80 pt-4">
        Scan Room QR Code to Register &bull; College Hackathon 2026
      </div>

    </main>
  )
}
