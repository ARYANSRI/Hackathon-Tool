'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyTeamCode, loginMember } from '@/app/actions/login'
import { KeyRound, Users, ShieldAlert, ArrowRight, Loader2, CheckCircle2, Crown, Sparkles, RefreshCw } from 'lucide-react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryCode = searchParams.get('code') || ''

  const [code, setCode] = useState(queryCode.toUpperCase())
  const [verifying, setVerifying] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step state
  const [step, setStep] = useState<'enter_code' | 'pick_member'>('enter_code')
  
  // Loaded Team Data
  const [teamData, setTeamData] = useState<{
    id: string
    name: string
    code: string
    roomId: string
    roomName: string
  } | null>(null)

  const [members, setMembers] = useState<{ id: string; name: string; is_leader: boolean }[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  // Auto-verify if code passed in URL query
  useEffect(() => {
    if (queryCode && queryCode.length === 6) {
      handleVerifyCode(queryCode)
    }
  }, [queryCode])

  const handleVerifyCode = async (codeToVerify?: string) => {
    const targetCode = (codeToVerify || code).trim().toUpperCase()
    if (!targetCode || targetCode.length !== 6) {
      setError('Please enter a valid 6-character team code.')
      return
    }

    setError(null)
    setVerifying(true)
    const res = await verifyTeamCode(targetCode)
    setVerifying(false)

    if (res.success && res.team && res.members) {
      setTeamData(res.team)
      setMembers(res.members)
      setStep('pick_member')
    } else {
      setError(res.error || 'Invalid code.')
    }
  }

  const handleMemberLogin = async () => {
    if (!selectedMemberId || !teamData) {
      setError('Please select your name from the team list.')
      return
    }

    // Generate or retrieve persistent device token
    let deviceToken = localStorage.getItem('hackathon_device_token')
    if (!deviceToken) {
      deviceToken = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
      localStorage.setItem('hackathon_device_token', deviceToken)
    }

    setLoggingIn(true)
    setError(null)

    const res = await loginMember({
      memberId: selectedMemberId,
      teamId: teamData.id,
      deviceToken,
    })

    setLoggingIn(false)

    if (res.success) {
      router.push('/dashboard')
    } else {
      setError(res.error || 'Failed to login. Please try again.')
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Participant Access Portal</span>
          </div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight">
            Team <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Login</span>
          </h1>
          <p className="text-slate-400 text-sm">
            {step === 'enter_code'
              ? 'Enter your 6-character team code provided during registration.'
              : `Welcome ${teamData?.name}! Pick your name to log in.`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start space-x-3 text-rose-300 text-sm animate-in fade-in duration-200">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* STEP 1: Enter Code */}
        {step === 'enter_code' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <span>6-Character Team Code</span>
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. 7K9P2X"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl px-4 py-4 text-center font-mono font-bold text-2xl tracking-widest text-indigo-300 placeholder-slate-700 outline-none transition uppercase"
              />
            </div>

            <button
              onClick={() => handleVerifyCode()}
              disabled={verifying || code.length !== 6}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50 text-base"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 2: Pick Member */}
        {step === 'pick_member' && teamData && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-indigo-400 font-semibold">{teamData.roomName}</span>
                <h3 className="text-lg font-bold text-slate-100">{teamData.name}</h3>
              </div>
              <button
                onClick={() => setStep('enter_code')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Change Code</span>
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Select Your Name</span>
              </label>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMemberId(m.id)}
                    className={`w-full p-4 rounded-xl text-left border transition flex items-center justify-between ${
                      selectedMemberId === m.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {m.is_leader ? (
                        <div className="w-7 h-7 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center">
                          <Crown className="w-4 h-4 text-amber-400" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 text-xs font-bold">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold text-sm">{m.name}</span>
                    </div>

                    {m.is_leader && (
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-md border border-amber-500/20">
                        Leader
                      </span>
                    )}

                    {selectedMemberId === m.id && (
                      <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleMemberLogin}
              disabled={loggingIn || !selectedMemberId}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50 text-base"
            >
              {loggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Logging In...</span>
                </>
              ) : (
                <>
                  <span>Enter Event Dashboard</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
