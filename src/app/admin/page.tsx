'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  getAdminOverviewData,
  ensureDefaultRounds,
  updateRoundStatus,
  getRoundQuestions,
  addOrUpdateQuestion,
  deleteQuestion,
  importQuestionsFromCSV,
  exportTeamsCSV,
} from '@/app/actions/admin'
import { startQuestionRun, closeQuestionRun, advanceNextQuestion } from '@/app/actions/quiz'
import { toggleLeaderboardConfig } from '@/app/actions/leaderboard'
import { adminAdjustDeadline, adminUnlockTeamSubmission, exportSubmissionsCSV } from '@/app/actions/submissions'
import {
  ShieldCheck,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Upload,
  Plus,
  Trash2,
  Edit,
  Download,
  Building2,
  Users,
  FileSpreadsheet,
  Loader2,
  X,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Zap,
  FastForward,
} from 'lucide-react'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  // Overview Data
  const [event, setEvent] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [rounds, setRounds] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalRooms: 0,
    totalTeams: 0,
    activeSessions: 0,
    totalSubmissions: 0,
    serverTime: '',
  })

  // Selected Quiz Round
  const [questions, setQuestions] = useState<any[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)

  // Question Form Modal
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null)
  const [qText, setQText] = useState('')
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', ''])
  const [qCorrectIndex, setQCorrectIndex] = useState(0)
  const [qTimeLimit, setQTimeLimit] = useState(20)
  const [savingQuestion, setSavingQuestion] = useState(false)

  // CSV Import Modal
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [csvRawText, setCsvRawText] = useState('')
  const [importingCsv, setImportingCsv] = useState(false)

  // Auto-Advance Mode State
  const [autoAdvanceMode, setAutoAdvanceMode] = useState(false)
  const [autoStatusText, setAutoStatusText] = useState<string | null>(null)

  // Alert Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    const res = await getAdminOverviewData()
    if (res.success && res.event) {
      setEvent(res.event)
      setRooms(res.rooms || [])
      setRounds(res.rounds || [])
      if (res.stats) setStats(res.stats)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Fetch Questions for Quiz Round
  const quizRound = rounds.find(r => r.type === 'quiz')
  useEffect(() => {
    if (quizRound?.id) {
      loadQuestions(quizRound.id)
    }
  }, [quizRound?.id])

  const loadQuestions = async (roundId: string) => {
    setLoadingQuestions(true)
    const res = await getRoundQuestions(roundId)
    if (res.success) setQuestions(res.questions || [])
    setLoadingQuestions(false)
  }

  // Round Status Controller
  const handleUpdateRoundStatus = async (roundId: string, status: 'upcoming' | 'live' | 'ended', startsInMins = 0) => {
    let startsAt: string | null = null
    if (status === 'upcoming' && startsInMins > 0) {
      startsAt = new Date(Date.now() + startsInMins * 60 * 1000).toISOString()
    } else if (status === 'live') {
      startsAt = new Date().toISOString()
    }

    const res = await updateRoundStatus({ roundId, status, startsAt })
    if (res.success) {
      setSuccessMsg(`Round status updated to "${status.toUpperCase()}".`)
      setTimeout(() => setSuccessMsg(null), 3000)
      loadData()
    } else {
      setErrorMsg(res.error || 'Failed to update round.')
    }
  }

  // Question Form Submit
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quizRound) return

    if (!qText.trim()) {
      setErrorMsg('Question text is required.')
      return
    }

    if (qOptions.some(o => !o.trim())) {
      setErrorMsg('All 4 options must be filled out.')
      return
    }

    setSavingQuestion(true)
    const res = await addOrUpdateQuestion({
      id: editingQuestion?.id,
      roundId: quizRound.id,
      order: editingQuestion ? editingQuestion.order : questions.length + 1,
      text: qText,
      options: qOptions,
      correctIndex: qCorrectIndex,
      timeLimit: qTimeLimit,
    })
    setSavingQuestion(false)

    if (res.success) {
      setShowQuestionModal(false)
      setEditingQuestion(null)
      setSuccessMsg('Question saved successfully.')
      setTimeout(() => setSuccessMsg(null), 3000)
      loadQuestions(quizRound.id)
    } else {
      setErrorMsg(res.error || 'Failed to save question.')
    }
  }

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return
    const res = await deleteQuestion(id)
    if (res.success && quizRound) {
      setSuccessMsg('Question deleted.')
      setTimeout(() => setSuccessMsg(null), 3000)
      loadQuestions(quizRound.id)
    }
  }

  const openQuestionModal = (q: any = null) => {
    if (q) {
      setEditingQuestion(q)
      setQText(q.text)
      setQOptions(Array.isArray(q.options) ? q.options : ['', '', '', ''])
      setQCorrectIndex(q.correct_index || 0)
      setQTimeLimit(q.time_limit || 20)
    } else {
      setEditingQuestion(null)
      setQText('')
      setQOptions(['', '', '', ''])
      setQCorrectIndex(0)
      setQTimeLimit(20)
    }
    setShowQuestionModal(true)
  }

  // Handle CSV Import
  const handleImportCSV = async () => {
    if (!quizRound) return
    if (!csvRawText.trim()) {
      setErrorMsg('Please paste CSV content.')
      return
    }

    setImportingCsv(true)
    const res = await importQuestionsFromCSV(quizRound.id, csvRawText)
    setImportingCsv(false)

    if (res.success) {
      setShowCsvModal(false)
      setCsvRawText('')
      setSuccessMsg(`Successfully imported ${res.count} questions!`)
      setTimeout(() => setSuccessMsg(null), 4000)
      loadQuestions(quizRound.id)
    } else {
      setErrorMsg(res.error || 'Failed to import CSV.')
    }
  }

  const handleLaunchQuestion = async (questionId: string, order: number) => {
    const res = await startQuestionRun(questionId)
    if (res.success) {
      setSuccessMsg(`Question #${order} launched live to all clients!`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } else {
      setErrorMsg(res.error || 'Failed to launch question.')
    }
  }

  const handleNextAutoQuestion = async () => {
    if (!quizRound) return
    const res = await advanceNextQuestion(quizRound.id)
    if (res.success) {
      if (res.completed) {
        setAutoAdvanceMode(false)
        setSuccessMsg('🎉 All Quiz Questions Completed!')
        setTimeout(() => setSuccessMsg(null), 4000)
      } else {
        setSuccessMsg('⚡ Auto-advanced to next question!')
        setTimeout(() => setSuccessMsg(null), 3000)
      }
      loadQuestions(quizRound.id)
    } else {
      setErrorMsg(res.error || 'Failed to auto-advance question.')
      setAutoAdvanceMode(false)
    }
  }

  // Auto-Advance Timer Effect
  useEffect(() => {
    if (!autoAdvanceMode || !quizRound) return

    // Auto-advance loop: check active run or auto-trigger next question
    const interval = setInterval(async () => {
      await handleNextAutoQuestion()
    }, 24000) // 20s time limit + 4s between-question reveal buffer

    return () => clearInterval(interval)
  }, [autoAdvanceMode, quizRound])

  const handleToggleLeaderboardVisible = async (currentVisible: boolean) => {
    const res = await toggleLeaderboardConfig({ visible: !currentVisible })
    if (res.success) {
      setSuccessMsg(`Leaderboards are now ${!currentVisible ? 'VISIBLE' : 'HIDDEN'} to participants.`)
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  const handleToggleLeaderboardFrozen = async (currentFrozen: boolean) => {
    const res = await toggleLeaderboardConfig({ frozen: !currentFrozen })
    if (res.success) {
      setSuccessMsg(`Leaderboards are now ${!currentFrozen ? 'FROZEN' : 'UNFROZEN'}.`)
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  const handleAdjustDeadline = async (roundId: string, deltaMinutes: number) => {
    const res = await adminAdjustDeadline(roundId, deltaMinutes)
    if (res.success) {
      setSuccessMsg(`Adjusted deadline by ${deltaMinutes > 0 ? '+' : ''}${deltaMinutes} minutes.`)
      setTimeout(() => setSuccessMsg(null), 3000)
      loadData()
    } else {
      setErrorMsg(res.error || 'Failed to adjust deadline.')
    }
  }

  const handleExportSubmissions = async () => {
    const csvData = await exportSubmissionsCSV()
    if (!csvData) {
      setErrorMsg('No submissions available to export yet.')
      return
    }

    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hackathon_submissions_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  // Handle Export CSV
  const handleExportTeams = async () => {
    const csvData = await exportTeamsCSV()
    if (!csvData) {
      setErrorMsg('No teams available to export.')
      return
    }

    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hackathon_teams_codes_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Admin Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/')}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Super Admin Control Panel</span>
              </span>
              <span className="text-xs text-slate-500">Live Server</span>
            </div>
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">{event?.name || 'College Hackathon'}</h1>
            <p className="text-slate-400 text-sm">Control round state, manage questions, and monitor room activities.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => handleToggleLeaderboardVisible(event?.config?.leaderboard_visible !== false)}
              className="px-4 py-3.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold rounded-2xl transition flex items-center space-x-2 text-sm"
            >
              <span>{event?.config?.leaderboard_visible === false ? 'Show Leaderboards' : 'Hide Leaderboards'}</span>
            </button>

            <button
              onClick={() => router.push('/projector/global')}
              className="px-4 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition flex items-center space-x-2 text-sm shadow-lg shadow-indigo-600/20"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Stage Global Projector</span>
            </button>

            <button
              onClick={handleExportSubmissions}
              className="flex-1 md:flex-none px-4 py-3.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-bold rounded-2xl transition flex items-center justify-center space-x-2 text-sm border border-indigo-500/40"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Export Submissions CSV</span>
            </button>

            <button
              onClick={handleExportTeams}
              className="flex-1 md:flex-none px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl transition flex items-center justify-center space-x-2 text-sm border border-slate-700"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Export Teams CSV</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-emerald-300 text-sm flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-300 text-sm flex items-center space-x-2 animate-in fade-in">
            <X className="w-5 h-5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Live Counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Rooms</span>
            <div className="text-3xl font-black text-slate-100">{stats.totalRooms}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Registered Teams</span>
            <div className="text-3xl font-black text-indigo-400">{stats.totalTeams}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Device Sessions</span>
            <div className="text-3xl font-black text-emerald-400">{stats.activeSessions}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Submissions Received</span>
            <div className="text-3xl font-black text-amber-400">{stats.totalSubmissions}</div>
          </div>
        </div>

        {/* SECTION 1: Rounds Status Control */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <span>Event Rounds & Countdown Control</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rounds.map((round) => (
              <div key={round.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">
                      Round #{round.order} &bull; {round.type.toUpperCase()}
                    </span>
                    <h3 className="text-xl font-black text-slate-100">{round.config?.title || round.type}</h3>
                  </div>

                  <span className={`px-3 py-1 text-xs font-black rounded-full uppercase tracking-wider ${
                    round.status === 'live'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                      : round.status === 'ended'
                      ? 'bg-slate-800 text-slate-400 border border-slate-700'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}>
                    {round.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-semibold text-slate-400 block">Change Status:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleUpdateRoundStatus(round.id, 'upcoming', 5)}
                      className={`py-2.5 text-xs font-bold rounded-xl transition ${
                        round.status === 'upcoming'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      Upcoming (5m Count)
                    </button>

                    <button
                      onClick={() => handleUpdateRoundStatus(round.id, 'live')}
                      className={`py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1 ${
                        round.status === 'live'
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                          : 'bg-slate-950 text-emerald-400 hover:bg-slate-800'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>START LIVE</span>
                    </button>

                    <button
                      onClick={() => handleUpdateRoundStatus(round.id, 'ended')}
                      className={`py-2.5 text-xs font-bold rounded-xl transition ${
                        round.status === 'ended'
                          ? 'bg-slate-800 text-slate-300 border border-slate-700'
                          : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      End Round
                    </button>
                  </div>
                </div>

                {round.type === 'build' && (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">Adjust Build Deadline</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleAdjustDeadline(round.id, -5)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-bold rounded-lg transition"
                      >
                        -5 Mins
                      </button>
                      <button
                        onClick={() => handleAdjustDeadline(round.id, 5)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold rounded-lg transition"
                      >
                        +5 Mins
                      </button>
                      <button
                        onClick={() => handleAdjustDeadline(round.id, 15)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-bold rounded-lg transition"
                      >
                        +15 Mins
                      </button>
                    </div>
                  </div>
                )}

                {round.starts_at && (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-400 flex items-center justify-between">
                    <span>Scheduled Starts At:</span>
                    <span className="font-mono text-indigo-300 font-bold">{new Date(round.starts_at).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: Quiz Questions Manager & CSV Import */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                <span>Round 1 Quiz Questions ({questions.length})</span>
              </h2>
              {autoAdvanceMode && (
                <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-300 text-xs font-extrabold animate-pulse">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  <span>Auto-Advance Quiz Sequence: ACTIVE (advancing every question time limit + 4s)</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Auto-Advance Mode Toggle */}
              <button
                onClick={() => {
                  if (!autoAdvanceMode) {
                    handleNextAutoQuestion()
                    setAutoAdvanceMode(true)
                  } else {
                    setAutoAdvanceMode(false)
                  }
                }}
                className={`px-4 py-2.5 font-black text-xs rounded-xl transition flex items-center space-x-2 shadow-lg ${
                  autoAdvanceMode
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20'
                }`}
              >
                {autoAdvanceMode ? <Pause className="w-4 h-4 fill-current" /> : <Zap className="w-4 h-4 fill-current" />}
                <span>{autoAdvanceMode ? 'Pause Auto-Quiz' : '▶ Start Auto-Quiz Sequence'}</span>
              </button>

              {/* Fast Forward Next Question Button */}
              <button
                onClick={handleNextAutoQuestion}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 border border-slate-700"
                title="Immediately advance to next question"
              >
                <FastForward className="w-3.5 h-3.5 text-indigo-400" />
                <span>Next Question</span>
              </button>

              <button
                onClick={() => setShowCsvModal(true)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 border border-slate-700"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Import CSV</span>
              </button>

              <button
                onClick={() => openQuestionModal()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {loadingQuestions ? (
            <div className="p-8 text-center"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto" /></div>
          ) : questions.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-500 space-y-3">
              <HelpCircle className="w-10 h-10 text-slate-700 mx-auto" />
              <p className="text-sm font-semibold">No quiz questions added yet.</p>
              <p className="text-xs">Add questions manually or import via CSV file.</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="divide-y divide-slate-800">
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-950/40 transition">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 bg-indigo-500/20 text-indigo-300 font-bold text-xs rounded-full flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-slate-100 text-sm sm:text-base">{q.text}</h4>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full font-semibold">
                          {q.time_limit}s
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {Array.isArray(q.options) && q.options.map((opt: string, optIdx: number) => (
                          <div
                            key={optIdx}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                              q.correct_index === optIdx
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                                : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}
                          >
                            <span className="opacity-60 mr-1">{String.fromCharCode(65 + optIdx)}:</span>
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-center">
                      <button
                        onClick={() => handleLaunchQuestion(q.id, idx + 1)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-lg transition flex items-center space-x-1 shadow-md shadow-emerald-500/20"
                        title="Launch this question live to all clients"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Launch Live</span>
                      </button>
                      <button
                        onClick={() => openQuestionModal(q)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Rooms & Facilitator Portals */}
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <span>Lab Rooms & Facilitators ({rooms.length})</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {rooms.map((r) => (
              <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-100 text-base">{r.name}</h3>
                    <span className={`w-2 h-2 rounded-full ${r.registration_open ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block">Token: {r.registration_token}</span>
                  <p className="text-xs text-indigo-400 font-bold mt-2">{r.teams?.length || 0} Teams Registered</p>
                </div>

                <button
                  onClick={() => router.push(`/facilitator/${r.registration_token}`)}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-1"
                >
                  <span>Open Room Panel</span>
                  <ExternalLink className="w-3 h-3 text-amber-400" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* MANUAL QUESTION MODAL */}
        {showQuestionModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
            <form onSubmit={handleSaveQuestion} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-100">
                  {editingQuestion ? 'Edit Question' : 'Add Quiz Question'}
                </h3>
                <button type="button" onClick={() => setShowQuestionModal(false)} className="p-2 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-400">Question Text</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter question prompt..."
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">4 Options (Select Correct Radio)</label>
                  {qOptions.map((opt, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="correct_index"
                        checked={qCorrectIndex === i}
                        onChange={() => setQCorrectIndex(i)}
                        className="w-4 h-4 text-emerald-500 accent-emerald-500"
                      />
                      <input
                        type="text"
                        required
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        value={opt}
                        onChange={(e) => {
                          const updated = [...qOptions]
                          updated[i] = e.target.value
                          setQOptions(updated)
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm outline-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-400">Time Limit (Seconds)</label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={qTimeLimit}
                    onChange={(e) => setQTimeLimit(parseInt(e.target.value, 10) || 20)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuestion}
                  className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center space-x-2"
                >
                  {savingQuestion ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Question</span>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CSV IMPORT MODAL */}
        {showCsvModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-100">Import Questions via CSV</h3>
                <button onClick={() => setShowCsvModal(false)} className="p-2 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-400 space-y-1">
                  <span className="font-bold text-amber-400">Expected CSV Format:</span>
                  <p className="font-mono text-[11px] text-slate-300">
                    order, text, optionA, optionB, optionC, optionD, correctIndex (0-3), timeLimit (s)
                  </p>
                </div>

                <textarea
                  rows={8}
                  placeholder={`1, What is Next.js?, React Framework, CSS Library, Database, Operating System, 0, 20\n2, What is Supabase?, Postgres Backend, Code Editor, Hosting Provider, CSS Grid, 0, 20`}
                  value={csvRawText}
                  onChange={(e) => setCsvRawText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-mono text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportCSV}
                  disabled={importingCsv}
                  className="px-6 py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-2"
                >
                  {importingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Import Questions</span>}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
