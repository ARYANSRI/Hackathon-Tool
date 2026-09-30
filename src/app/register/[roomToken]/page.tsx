'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { getRoomByToken, registerTeam } from '@/app/actions/registration'
import { ensureDefaultEventAndRooms } from '@/app/actions/seed'
import { Users, UserPlus, ShieldAlert, CheckCircle2, Copy, ArrowRight, Loader2, Sparkles, X } from 'lucide-react'

export default function RegisterRoomPage({ params }: { params: Promise<{ roomToken: string }> }) {
  const resolvedParams = use(params)
  const roomToken = resolvedParams.roomToken
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [room, setRoom] = useState<{ id: string; name: string; registration_open: boolean } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Form State
  const [teamName, setTeamName] = useState('')
  const [leaderName, setLeaderName] = useState('')
  const [members, setMembers] = useState<string[]>([''])

  // Success State
  const [registeredCode, setRegisteredCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function loadRoom() {
      setLoading(true)
      // Auto seed default rooms if fresh DB
      await ensureDefaultEventAndRooms()

      const res = await getRoomByToken(roomToken)
      if (res.success && res.room) {
        setRoom(res.room)
      } else {
        setErrorMessage(res.error || 'Failed to load room details.')
      }
      setLoading(false)
    }

    loadRoom()
  }, [roomToken])

  const handleAddMember = () => {
    if (members.length < 9) {
      setMembers([...members, ''])
    }
  }

  const handleRemoveMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index))
  }

  const handleMemberChange = (index: number, value: string) => {
    const updated = [...members]
    updated[index] = value
    setMembers(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!teamName.trim()) {
      setErrorMessage('Please enter a team name.')
      return
    }

    if (!leaderName.trim()) {
      setErrorMessage('Please enter the team leader name.')
      return
    }

    setSubmitting(true)
    const res = await registerTeam({
      roomToken,
      teamName,
      leaderName,
      memberNames: members,
    })

    setSubmitting(false)

    if (res.success && res.teamCode) {
      setRegisteredCode(res.teamCode)
    } else {
      setErrorMessage(res.error || 'Registration failed. Please try again.')
    }
  }

  const handleCopyCode = () => {
    if (registeredCode) {
      navigator.clipboard.writeText(registeredCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm animate-pulse">Loading registration details...</p>
        </div>
      </main>
    )
  }

  if (errorMessage && !room) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-xl space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-100">Invalid Registration Link</h2>
          <p className="text-slate-400 text-sm">{errorMessage}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition"
          >
            Go to Home
          </button>
        </div>
      </main>
    )
  }

  if (room && !room.registration_open && !registeredCode) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/90 backdrop-blur border border-amber-500/20 rounded-2xl p-8 text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
            <ShieldAlert className="w-8 h-8 text-amber-400" />
          </div>
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-300 text-xs font-semibold rounded-full border border-amber-500/20">
              {room.name}
            </span>
            <h2 className="text-2xl font-bold text-slate-100">Registration Closed</h2>
            <p className="text-slate-400 text-sm">
              Registration for <span className="font-semibold text-amber-300">{room.name}</span> is currently closed by your room facilitator.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            If you already have a team code, click below to log in.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2"
          >
            <span>Proceed to Team Login</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    )
  }

  // Success Screen
  if (registeredCode) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 text-center shadow-2xl space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>

          <div>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20">
              {room?.name}
            </span>
            <h2 className="text-2xl font-extrabold text-slate-100 mt-2">Team Registered!</h2>
            <p className="text-slate-400 text-sm mt-1">
              Your team <span className="text-indigo-400 font-semibold">{teamName}</span> is registered.
            </p>
          </div>

          {/* Large Code Box */}
          <div className="bg-slate-950 border border-indigo-500/40 rounded-2xl p-6 relative group space-y-2 shadow-inner">
            <span className="text-xs text-indigo-400 uppercase tracking-wider font-semibold">Your 6-Character Team Code</span>
            <div className="text-4xl font-mono font-black text-indigo-300 tracking-widest select-all">
              {registeredCode}
            </div>
            <button
              onClick={handleCopyCode}
              className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/50 text-indigo-200 text-xs font-medium rounded-lg transition"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
            </button>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-left flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
              <strong className="text-amber-300">IMPORTANT:</strong> Take a screenshot of this code or tell your room facilitator now. All members need this code to log in.
            </p>
          </div>

          <button
            onClick={() => router.push(`/login?code=${registeredCode}`)}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2 text-base"
          >
            <span>Proceed to Member Login</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-8 px-4 sm:px-6">
      <div className="max-w-lg w-full mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hackathon Team Registration</span>
          </div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight">
            Register for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">{room?.name}</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Fill in your team info to get your 6-character access code.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start space-x-3 text-rose-300 text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)}>
              <X className="w-4 h-4 text-rose-400 hover:text-rose-200" />
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          
          {/* Team Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Team Name</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Byte Busters"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-600 outline-none transition font-medium text-sm"
            />
          </div>

          {/* Leader Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Team Leader Name</span>
            </label>
            <input
              type="text"
              required
              placeholder="Full name of team leader"
              value={leaderName}
              onChange={(e) => setLeaderName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-600 outline-none transition font-medium text-sm"
            />
          </div>

          {/* Team Members */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Other Team Members
              </label>
              <span className="text-xs text-slate-500">{members.length + 1} Total</span>
            </div>

            {members.map((member, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder={`Member #${index + 2} Name`}
                  value={member}
                  onChange={(e) => handleMemberChange(index, e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 outline-none transition text-sm"
                />
                {members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(index)}
                    className="p-3 text-slate-500 hover:text-rose-400 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddMember}
              disabled={members.length >= 9}
              className="w-full py-3 bg-slate-950 hover:bg-slate-800 border border-dashed border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Another Team Member</span>
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50 text-base"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Registering Team...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <button onClick={() => router.push('/login')} className="text-indigo-400 font-semibold hover:underline">
            Go to Team Login
          </button>
        </div>

      </div>
    </main>
  )
}
