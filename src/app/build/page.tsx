'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getParticipantSession } from '@/app/actions/login'
import { getBuildRoundState, getTeamSubmission, saveSubmissionDraft, finalSubmitTeam } from '@/app/actions/submissions'
import { Code2, GitBranch, ExternalLink, FileText, Lock, Save, Send, Clock, ShieldAlert, CheckCircle2, Loader2, Sparkles, ArrowLeft, X } from 'lucide-react'
import ParticipantNav from '@/components/ParticipantNav'

export default function BuildSubmissionPage() {
  const router = useRouter()

  const [session, setSession] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [round, setRound] = useState<any | null>(null)

  // Form State
  const [githubUrl, setGithubUrl] = useState('')
  const [deployUrl, setDeployUrl] = useState('')
  const [docsUrl, setDocsUrl] = useState('')
  const [description, setDescription] = useState('')

  // Submission Status
  const [status, setStatus] = useState<'draft' | 'final' | 'none'>('none')
  const [saving, setSaving] = useState(false)
  const [submittingFinal, setSubmittingFinal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Countdown State
  const [timeLeftStr, setTimeLeftStr] = useState<string>('00:00:00')
  const [isExpired, setIsExpired] = useState(false)
  const [serverOffsetMs, setServerOffsetMs] = useState(0)

  useEffect(() => {
    async function init() {
      const sess = await getParticipantSession()
      if (!sess) {
        router.push('/login')
        return
      }
      setSession(sess)

      const roundRes = await getBuildRoundState()
      if (roundRes.success && roundRes.round) {
        setRound(roundRes.round)

        const serverNow = new Date(roundRes.round.serverTime).getTime()
        setServerOffsetMs(serverNow - Date.now())

        // Fetch team submission
        const subRes = await getTeamSubmission(sess.teamId, roundRes.round.id)
        if (subRes.success && subRes.submission) {
          const s = subRes.submission
          setGithubUrl(s.github_url || '')
          setDeployUrl(s.deploy_url || '')
          setDocsUrl(s.docs_url || '')
          setDescription(s.description || '')
          setStatus(s.status || 'draft')
        }
      }

      setLoading(false)
    }

    init()
  }, [router])

  // Server-Synced Countdown Loop
  useEffect(() => {
    if (!round?.endsAt) return

    const timer = setInterval(() => {
      const targetTime = new Date(round.endsAt).getTime()
      const nowSynced = Date.now() + serverOffsetMs
      const remainingMs = Math.max(0, targetTime - nowSynced)

      if (remainingMs <= 0) {
        setIsExpired(true)
        setTimeLeftStr('00:00:00')
      } else {
        const hours = Math.floor(remainingMs / (1000 * 60 * 60))
        const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))
        const secs = Math.floor((remainingMs % (1000 * 60)) / 1000)

        const hStr = hours < 10 ? '0' + hours : hours
        const mStr = mins < 10 ? '0' + mins : mins
        const sStr = secs < 10 ? '0' + secs : secs

        setTimeLeftStr(`${hStr}:${mStr}:${sStr}`)
      }
    }, 500)

    return () => clearInterval(timer)
  }, [round, serverOffsetMs])

  const handleSaveDraft = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!session || !round) return

    setErrorMsg(null)
    setSaving(true)

    const res = await saveSubmissionDraft({
      teamId: session.teamId,
      roundId: round.id,
      githubUrl,
      deployUrl,
      docsUrl,
      description,
    })

    setSaving(false)

    if (res.success) {
      setStatus('draft')
      setSuccessMsg('Draft saved successfully!')
      setTimeout(() => setSuccessMsg(null), 3000)
    } else {
      setErrorMsg(res.error || 'Failed to save draft.')
    }
  }

  const handleConfirmFinalSubmit = async () => {
    if (!session || !round) return

    // First save latest draft
    const draftRes = await saveSubmissionDraft({
      teamId: session.teamId,
      roundId: round.id,
      githubUrl,
      deployUrl,
      docsUrl,
      description,
    })

    if (!draftRes.success) {
      setShowConfirmModal(false)
      setErrorMsg(draftRes.error || 'Failed to save draft before final submit.')
      return
    }

    setSubmittingFinal(true)
    const res = await finalSubmitTeam({
      teamId: session.teamId,
      roundId: round.id,
    })
    setSubmittingFinal(false)
    setShowConfirmModal(false)

    if (res.success) {
      setStatus('final')
      setSuccessMsg('Final Submission Completed & Locked!')
    } else {
      setErrorMsg(res.error || 'Failed to complete final submission.')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </main>
    )
  }

  const isLocked = status === 'final' || isExpired

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <ParticipantNav currentPath="build" />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full space-y-6">
      
      {/* Top Navbar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard')}
          className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <span className="text-xs text-indigo-400 font-bold">{session?.teamName} &bull; {session?.roomName}</span>
      </div>

      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-extrabold">
          <Code2 className="w-4 h-4 text-indigo-400" />
          <span>Round 2: Build & Submit</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight">
          Project <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-amber-300">Submission</span> Portal
        </h1>
        <p className="text-slate-400 text-sm">
          Submit your project repository, deployment link, and documentation before the deadline.
        </p>
      </div>

      {/* Server Synced Deadline Clock */}
      <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 text-center space-y-2 shadow-2xl relative overflow-hidden">
        <span className="text-xs text-indigo-400 font-extrabold uppercase tracking-widest block">Submission Deadline Countdown</span>
        <div className={`text-4xl sm:text-5xl font-mono font-black tracking-widest ${isExpired ? 'text-rose-500' : 'text-indigo-300'}`}>
          {timeLeftStr}
        </div>
        {isExpired && (
          <p className="text-xs text-rose-400 font-bold">Deadline reached. Unsubmitted drafts marked as "Draft (not final)".</p>
        )}
      </div>

      {/* Problem Statement Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-2 shadow-xl">
        <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
          <Sparkles className="w-4 h-4" />
          <span>Problem Statement</span>
        </h3>
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
          {round?.problemStatement}
        </p>
      </div>

      {/* Lock Notice if Final Submitted */}
      {isLocked && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 text-amber-300 text-sm font-bold flex items-center space-x-3">
          <Lock className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p>Submission Locked ({status === 'final' ? 'Final Submit Completed' : 'Deadline Expired'})</p>
            <p className="text-xs text-amber-200/80 font-normal">Contact your facilitator or admin if you require an emergency unlock.</p>
          </div>
        </div>
      )}

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-emerald-300 text-sm flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-300 text-sm flex items-center space-x-2 animate-in fade-in">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Submission Form */}
      <form onSubmit={handleSaveDraft} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        
        {/* GitHub Link */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <GitBranch className="w-4 h-4 text-indigo-400" />
            <span>GitHub Repository URL <span className="text-indigo-400">*</span></span>
          </label>
          <input
            type="url"
            disabled={isLocked}
            placeholder="https://github.com/your-team/project"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-600 text-sm outline-none disabled:opacity-60"
          />
        </div>

        {/* Deployed App Link */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <ExternalLink className="w-4 h-4 text-indigo-400" />
            <span>Deployed Application URL (Vercel, Netlify, etc.)</span>
          </label>
          <input
            type="url"
            disabled={isLocked}
            placeholder="https://your-hackathon-app.vercel.app"
            value={deployUrl}
            onChange={(e) => setDeployUrl(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-600 text-sm outline-none disabled:opacity-60"
          />
        </div>

        {/* Documentation / Deck Link */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>Documentation / Slide Deck Link (Optional)</span>
          </label>
          <input
            type="url"
            disabled={isLocked}
            placeholder="https://docs.google.com/presentation/d/..."
            value={docsUrl}
            onChange={(e) => setDocsUrl(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-600 text-sm outline-none disabled:opacity-60"
          />
        </div>

        {/* Short Description */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Project Description & Features
          </label>
          <textarea
            rows={4}
            disabled={isLocked}
            placeholder="Briefly describe what your project does, key features, and technology stack..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-4 text-slate-100 placeholder-slate-600 text-sm outline-none disabled:opacity-60"
          />
        </div>

        {/* Action Buttons */}
        {!isLocked && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl transition flex items-center justify-center space-x-2 border border-slate-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-indigo-400" />}
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Final Submit & Lock</span>
            </button>
          </div>
        )}
      </form>

      {/* FINAL SUBMIT CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full space-y-6 text-center shadow-2xl relative">
            <button onClick={() => setShowConfirmModal(false)} className="absolute top-4 right-4 p-2 text-slate-400">
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-100">Confirm Final Submit</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Once you press Final Submit, your submission will be <strong className="text-amber-400">locked</strong> and cannot be edited without admin assistance.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmFinalSubmit}
                disabled={submittingFinal}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center space-x-2"
              >
                {submittingFinal ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Lock & Submit</span>}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
    </div>
  )
}
