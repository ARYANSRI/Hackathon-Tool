'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import {
  getFacilitatorRoomData,
  toggleRegistrationStatus,
  regenerateTeamCode,
  editTeamDetails,
  deleteTeam,
  resetMemberSession,
} from '@/app/actions/facilitator'
import { ensureDefaultEventAndRooms } from '@/app/actions/seed'
import {
  Users,
  Building2,
  Copy,
  RefreshCw,
  Edit2,
  Trash2,
  RotateCcw,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  X,
  Check,
  Crown,
  Plus,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react'

export default function FacilitatorPanelPage({ params }: { params: Promise<{ roomToken: string }> }) {
  const resolvedParams = use(params)
  const roomToken = resolvedParams.roomToken
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [roomData, setRoomData] = useState<{
    id: string
    name: string
    registration_token: string
    registration_open: boolean
  } | null>(null)

  const [stats, setStats] = useState({ totalTeams: 0, totalMembers: 0 })
  const [teams, setTeams] = useState<any[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // Edit Modal State
  const [editingTeam, setEditingTeam] = useState<any | null>(null)
  const [editTeamName, setEditTeamName] = useState('')
  const [editMembers, setEditMembers] = useState<{ id?: string; name: string; is_leader: boolean }[]>([])
  const [savingEdit, setSavingEdit] = useState(false)

  // QR Modal
  const [showQrModal, setShowQrModal] = useState(false)
  const [baseUrl, setBaseUrl] = useState<string>('')

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      setBaseUrl(process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ''))
    } else if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin)
    }
  }, [])

  const currentOrigin =
    baseUrl ||
    (typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
      : 'http://localhost:3000')

  const regUrl = `${currentOrigin}/register/${roomToken}`

  const loadData = async () => {
    setLoading(true)
    await ensureDefaultEventAndRooms()
    const res = await getFacilitatorRoomData(roomToken)
    if (res.success && res.room) {
      setRoomData(res.room)
      setStats(res.stats)
      setTeams(res.teams || [])
    } else {
      setErrorMessage(res.error || 'Failed to load facilitator data.')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [roomToken])

  const handleToggleRegistration = async () => {
    if (!roomData) return
    setUpdatingStatus(true)
    const newStatus = !roomData.registration_open
    const res = await toggleRegistrationStatus(roomToken, newStatus)
    setUpdatingStatus(false)
    if (res.success) {
      setRoomData({ ...roomData, registration_open: newStatus })
      setSuccessMessage(`Registration is now ${newStatus ? 'OPEN' : 'CLOSED'} for ${roomData.name}.`)
      setTimeout(() => setSuccessMessage(null), 3000)
    }
  }

  const handleRegenerateCode = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to regenerate the access code for team "${teamName}"?`)) return
    const res = await regenerateTeamCode(teamId, roomToken)
    if (res.success) {
      setSuccessMessage(`New code for "${teamName}" is ${res.newCode}.`)
      setTimeout(() => setSuccessMessage(null), 4000)
      loadData()
    } else {
      setErrorMessage(res.error || 'Failed to regenerate code.')
    }
  }

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to DELETE team "${teamName}"? This cannot be undone.`)) return
    const res = await deleteTeam(teamId, roomToken)
    if (res.success) {
      setSuccessMessage(`Deleted team "${teamName}".`)
      setTimeout(() => setSuccessMessage(null), 3000)
      loadData()
    } else {
      setErrorMessage(res.error || 'Failed to delete team.')
    }
  }

  const handleResetSession = async (memberId: string, memberName: string) => {
    const res = await resetMemberSession(memberId, roomToken)
    if (res.success) {
      setSuccessMessage(`Reset session for ${memberName}. They can now log in again.`)
      setTimeout(() => setSuccessMessage(null), 3000)
      loadData()
    }
  }

  const openEditModal = (team: any) => {
    setEditingTeam(team)
    setEditTeamName(team.name)
    setEditMembers(team.members ? team.members.map((m: any) => ({ id: m.id, name: m.name, is_leader: m.is_leader })) : [])
  }

  const handleSaveEdit = async () => {
    if (!editingTeam) return
    setSavingEdit(true)
    const res = await editTeamDetails({
      teamId: editingTeam.id,
      teamName: editTeamName,
      members: editMembers,
      roomToken,
    })
    setSavingEdit(false)

    if (res.success) {
      setEditingTeam(null)
      setSuccessMessage('Team updated successfully.')
      setTimeout(() => setSuccessMessage(null), 3000)
      loadData()
    } else {
      setErrorMessage(res.error || 'Failed to update team.')
    }
  }

  const copyRegistrationLink = () => {
    navigator.clipboard.writeText(regUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header Bar */}
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
              <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-full border border-amber-500/20 flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>Facilitator Dashboard</span>
              </span>
              <span className="text-xs text-slate-500">Token: {roomToken}</span>
            </div>
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">{roomData?.name}</h1>
            <p className="text-slate-400 text-sm">Manage room registration, view team codes, and support participants.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Registration Open/Closed Toggle */}
            <button
              onClick={handleToggleRegistration}
              disabled={updatingStatus}
              className={`flex-1 md:flex-none px-6 py-3.5 rounded-2xl font-bold text-sm transition flex items-center justify-center space-x-2 shadow-lg ${
                roomData?.registration_open
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 shadow-emerald-500/10'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 shadow-rose-500/10'
              }`}
            >
              {updatingStatus ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : roomData?.registration_open ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Registration: OPEN</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span>Registration: CLOSED</span>
                </>
              )}
            </button>

            {/* QR / Link Button */}
            <button
              onClick={() => setShowQrModal(true)}
              className="px-4 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition flex items-center space-x-2 text-sm shadow-lg shadow-indigo-600/20"
            >
              <QrCode className="w-4 h-4" />
              <span>Show QR / Link</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-emerald-300 text-sm flex items-center space-x-2">
            <Check className="w-5 h-5 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-300 text-sm flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Registered Teams</span>
            <div className="text-3xl font-black text-amber-400">{stats.totalTeams}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Participants</span>
            <div className="text-3xl font-black text-indigo-400">{stats.totalMembers}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Room Status</span>
            <div className="text-lg font-bold text-slate-200 mt-1 flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${roomData?.registration_open ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span>{roomData?.registration_open ? 'Accepting Teams' : 'Registration Locked'}</span>
            </div>
          </div>
        </div>

        {/* Teams List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>Teams in {roomData?.name}</span>
            </h2>
            <button
              onClick={loadData}
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl transition"
              title="Refresh Teams"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {teams.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 space-y-3">
              <Users className="w-12 h-12 text-slate-700 mx-auto" />
              <p className="text-base font-semibold text-slate-400">No teams registered in this room yet.</p>
              <p className="text-xs text-slate-500">Share the QR code or registration link with students in {roomData?.name}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 space-y-4 shadow-xl transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-slate-100">{team.name}</h3>
                      <span className="text-xs text-slate-500">{team.members?.length || 0} Members</span>
                    </div>

                    {/* Team Code Display */}
                    <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl px-4 py-2 text-right">
                      <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Code</span>
                      <span className="text-xl font-mono font-black text-indigo-300 tracking-widest">{team.code}</span>
                    </div>
                  </div>

                  {/* Members List */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Team Members
                    </span>
                    <div className="space-y-1.5">
                      {team.members?.map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            {m.is_leader ? (
                              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                            )}
                            <span className={m.is_leader ? 'font-bold text-amber-200' : 'text-slate-300'}>
                              {m.name}
                            </span>
                            {m.is_leader && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded font-semibold">
                                Leader
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleResetSession(m.id, m.name)}
                            title="Reset member device session"
                            className="text-[10px] text-slate-500 hover:text-indigo-400 transition"
                          >
                            Reset Session
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                    <button
                      onClick={() => handleRegenerateCode(team.id, team.name)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>New Code</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(team)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition"
                        title="Edit Team & Members"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteTeam(team.id, team.name)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold rounded-xl transition"
                        title="Delete Team"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QR & Link Modal */}
        {showQrModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full space-y-6 text-center shadow-2xl relative">
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-2">
                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-full border border-amber-500/20">
                  {roomData?.name} Registration Link
                </span>
                <h3 className="text-2xl font-bold text-slate-100">Participant QR Code</h3>
                <p className="text-xs text-slate-400">
                  Students in {roomData?.name} can scan this or go directly to the link below to register.
                </p>
              </div>

              {/* Real Scannable QR Code SVG */}
              <div className="bg-white p-5 rounded-2xl inline-block shadow-inner">
                <QRCodeSVG
                  value={regUrl}
                  size={200}
                  level="H"
                  marginSize={1}
                />
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between space-x-2">
                <span className="text-xs font-mono text-indigo-300 truncate">{regUrl}</span>
                <button
                  onClick={copyRegistrationLink}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shrink-0"
                >
                  {copiedLink ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Team Modal */}
        {editingTeam && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-100">Edit Team: {editingTeam.name}</h3>
                <button onClick={() => setEditingTeam(null)} className="p-2 text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-400">Team Name</label>
                  <input
                    type="text"
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase text-slate-400">Members</label>
                  {editMembers.map((m, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={m.name}
                        onChange={(e) => {
                          const updated = [...editMembers]
                          updated[idx].name = e.target.value
                          setEditMembers(updated)
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editMembers.map((mem, i) => ({ ...mem, is_leader: i === idx }))
                          setEditMembers(updated)
                        }}
                        className={`px-3 py-2 text-xs font-bold rounded-xl transition ${
                          m.is_leader ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {m.is_leader ? 'Leader' : 'Make Leader'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Changes</span>}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
