'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getParticipantSession, logoutParticipant } from '@/app/actions/login'
import { LayoutDashboard, HelpCircle, Trophy, Code2, LogOut, Crown, Sparkles } from 'lucide-react'

interface ParticipantNavProps {
  currentPath: 'dashboard' | 'quiz' | 'leaderboard' | 'build'
}

export default function ParticipantNav({ currentPath }: ParticipantNavProps) {
  const router = useRouter()
  const [session, setSession] = useState<{
    memberName: string
    isLeader: boolean
    teamName: string
    roomName: string
  } | null>(null)

  useEffect(() => {
    async function load() {
      const sess = await getParticipantSession()
      if (sess) {
        setSession(sess)
      }
    }
    load()
  }, [])

  const handleLogout = async () => {
    await logoutParticipant()
    router.push('/login')
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { id: 'quiz', label: 'Quiz Arena', href: '/quiz', icon: HelpCircle },
    { id: 'leaderboard', label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { id: 'build', label: 'Build Round', href: '/build', icon: Code2 },
  ]

  return (
    <header className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 py-3">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* User Info & Team Tag */}
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600/20 border border-indigo-500/40 rounded-xl flex items-center justify-center text-indigo-300 font-bold text-sm">
              {session?.memberName ? session.memberName.charAt(0).toUpperCase() : 'P'}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-extrabold text-slate-100">{session?.memberName || 'Participant'}</span>
                {session?.isLeader && (
                  <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                )}
              </div>
              <span className="text-[11px] text-indigo-400 font-semibold block">
                {session?.teamName} &bull; {session?.roomName}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="sm:hidden px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-lg transition flex items-center space-x-1"
          >
            <LogOut className="w-3 h-3" />
            <span>Logout</span>
          </button>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-slate-950 p-1 rounded-2xl border border-slate-800/80 w-full sm:w-auto justify-center">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPath === item.id

            return (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Desktop Logout */}
        <button
          onClick={handleLogout}
          className="hidden sm:flex px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-xl transition items-center space-x-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>

      </div>
    </header>
  )
}
