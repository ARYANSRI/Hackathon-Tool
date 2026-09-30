'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ensureDefaultEventAndRooms } from '@/app/actions/seed'
import { KeyRound, Building2, QrCode, ArrowRight, Sparkles, ShieldCheck, Users, Code2 } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [selectedRoom, setSelectedRoom] = useState('room-01')

  useEffect(() => {
    // Seed default 10 rooms if missing
    ensureDefaultEventAndRooms()
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto space-y-12 relative z-10">
        
        {/* Header Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold tracking-wide">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>College Hackathon Platform 2026</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-100">
            Real-Time <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-amber-300">Hackathon Quiz & Build</span> Engine
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
            Welcome! Enter your 6-character team code to participate, or scan your lab room's QR code to self-register your team.
          </p>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Participant Login */}
          <div className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-8 space-y-6 shadow-2xl transition group relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 shadow-inner group-hover:scale-105 transition">
                <KeyRound className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-100">Participant Login</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Already registered? Enter your team's unique 6-character code to log in and select your member profile.
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push('/login')}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2 text-base"
            >
              <span>Go to Team Login</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Card 2: Room Facilitator Portal */}
          <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-8 space-y-6 shadow-2xl transition group relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 shadow-inner group-hover:scale-105 transition">
                <Building2 className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-100">Facilitator Portal</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Room facilitators can open/close registration, view team codes, fix member typos, and display room QR codes.
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push('/facilitator/login')}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-2 text-base"
            >
              <span>Open Facilitator Portal</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Card 3: Super Admin Control Panel */}
          <div className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-3xl p-8 space-y-6 shadow-2xl transition group relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 bg-cyan-500/20 border border-cyan-500/30 rounded-2xl flex items-center justify-center text-cyan-400 shadow-inner group-hover:scale-105 transition">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-100">Super Admin Panel</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Manage quiz questions, start/close live rounds, launch questions live, export team CSVs, and toggle leaderboards.
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push('/admin')}
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-600/20 transition flex items-center justify-center space-x-2 text-base"
            >
              <span>Open Admin Panel</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Quick Demo QR Links Section */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-indigo-400" />
                <span>Simulate Room QR Code Registration</span>
              </h3>
              <p className="text-xs text-slate-400">Select any lab room to test participant QR code self-registration (`/register/[roomToken]`).</p>
            </div>

            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500"
            >
              {Array.from({ length: 10 }, (_, i) => {
                const num = i + 1
                const token = `room-${num < 10 ? '0' + num : num}`
                return (
                  <option key={token} value={token}>
                    Lab Room {num < 10 ? '0' + num : num} ({token})
                  </option>
                )
              })}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push(`/register/${selectedRoom}`)}
              className="flex-1 py-3.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-sm rounded-xl transition flex items-center justify-center space-x-2"
            >
              <span>Test Registration Page for {selectedRoom.toUpperCase()}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => router.push(`/facilitator/${selectedRoom}`)}
              className="flex-1 py-3.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-sm rounded-xl transition flex items-center justify-center space-x-2"
            >
              <span>Test Facilitator Panel for {selectedRoom.toUpperCase()}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      <footer className="text-center text-xs text-slate-600 py-4 relative z-10">
        College Hackathon Real-time Engine &bull; Next.js + Supabase Realtime
      </footer>

    </main>
  )
}
