'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, ArrowRight, Sparkles, Building2 } from 'lucide-react'

export default function FacilitatorLoginPage() {
  const router = useRouter()
  const [selectedRoomToken, setSelectedRoomToken] = useState('room-01')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRoomToken) {
      setError('Please select your assigned room.')
      return
    }
    // Simple facilitator access routing
    router.push(`/facilitator/${selectedRoomToken}`)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Room Facilitator Portal</span>
          </div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight">
            Facilitator <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Login</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Select your assigned lab room to open/close registration and manage team codes.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Assigned Lab Room</span>
            </label>
            <select
              value={selectedRoomToken}
              onChange={(e) => setSelectedRoomToken(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3.5 text-slate-100 text-sm outline-none font-medium"
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

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-2 text-base"
          >
            <span>Open Room Control Panel</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

      </div>
    </main>
  )
}
