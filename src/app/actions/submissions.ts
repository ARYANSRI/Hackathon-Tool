'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// URL Validation Helper
function isValidUrl(urlStr: string): boolean {
  if (!urlStr || !urlStr.trim()) return true // Optional fields
  try {
    const parsed = new URL(urlStr.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// Fetch Build Round Info & Problem Statement
export async function getBuildRoundState() {
  const supabase = createAdminClient()

  // Find Round 2 (Build)
  const { data: round } = await supabase
    .from('rounds')
    .select('*')
    .eq('type', 'build')
    .order('order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!round) {
    return { success: false, error: 'Build round not configured yet.' }
  }

  const config = (round.config as any) || {}

  return {
    success: true,
    round: {
      id: round.id,
      status: round.status,
      startsAt: round.starts_at,
      endsAt: round.ends_at,
      problemStatement: config.problem_statement || 'Build an innovative web or mobile application according to hackathon guidelines.',
      title: config.title || 'Round 2: Project Build & Submission',
      serverTime: new Date().toISOString(),
    },
  }
}

// Fetch Team Submission
export async function getTeamSubmission(teamId: string, roundId: string) {
  const supabase = createAdminClient()

  const { data: submission } = await supabase
    .from('submissions')
    .select('*')
    .eq('team_id', teamId)
    .eq('round_id', roundId)
    .maybeSingle()

  return { success: true, submission: submission || null }
}

// Save Submission Draft
export async function saveSubmissionDraft(payload: {
  teamId: string
  roundId: string
  githubUrl: string
  deployUrl: string
  docsUrl: string
  description: string
}) {
  const supabase = createAdminClient()

  // 1. Validate URLs
  if (payload.githubUrl && !isValidUrl(payload.githubUrl)) {
    return { success: false, error: 'Invalid GitHub URL. Must be a valid http:// or https:// link.' }
  }
  if (payload.deployUrl && !isValidUrl(payload.deployUrl)) {
    return { success: false, error: 'Invalid Deployed App URL. Must be a valid http:// or https:// link.' }
  }
  if (payload.docsUrl && !isValidUrl(payload.docsUrl)) {
    return { success: false, error: 'Invalid Documentation URL. Must be a valid http:// or https:// link.' }
  }

  // 2. Check if existing submission is already locked (final)
  const { data: existing } = await supabase
    .from('submissions')
    .select('id, status')
    .eq('team_id', payload.teamId)
    .eq('round_id', payload.roundId)
    .maybeSingle()

  if (existing && existing.status === 'final') {
    return { success: false, error: 'Submission is locked. Contact your administrator to unlock.' }
  }

  const nowStr = new Date().toISOString()
  const submissionData = {
    team_id: payload.teamId,
    round_id: payload.roundId,
    github_url: payload.githubUrl.trim(),
    deploy_url: payload.deployUrl.trim(),
    docs_url: payload.docsUrl.trim(),
    description: payload.description.trim(),
    status: 'draft',
    updated_at: nowStr,
  }

  if (existing) {
    await supabase.from('submissions').update(submissionData).eq('id', existing.id)
  } else {
    await supabase.from('submissions').insert(submissionData)
  }

  try { revalidatePath('/build') } catch {}
  return { success: true, status: 'draft', updatedAt: nowStr }
}

// Final Submit & Lock
export async function finalSubmitTeam(payload: { teamId: string; roundId: string }) {
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('submissions')
    .select('id, github_url, deploy_url')
    .eq('team_id', payload.teamId)
    .eq('round_id', payload.roundId)
    .maybeSingle()

  if (!existing || (!existing.github_url && !existing.deploy_url)) {
    return { success: false, error: 'Please save a draft with at least a GitHub or Deployed link before Final Submit.' }
  }

  const nowStr = new Date().toISOString()

  const { error } = await supabase
    .from('submissions')
    .update({
      status: 'final',
      submitted_at: nowStr,
      updated_at: nowStr,
    })
    .eq('id', existing.id)

  if (error) {
    return { success: false, error: 'Failed to complete Final Submit.' }
  }

  try {
    revalidatePath('/build')
    revalidatePath('/admin')
  } catch {}
  return { success: true, status: 'final', submittedAt: nowStr }
}

// ADMIN ACTIONS

// Admin Unlock Team Submission
export async function adminUnlockTeamSubmission(teamId: string, roundId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('submissions')
    .update({ status: 'draft' })
    .eq('team_id', teamId)
    .eq('round_id', roundId)

  if (error) {
    return { success: false, error: 'Failed to unlock team submission.' }
  }

  try {
    revalidatePath('/build')
    revalidatePath('/admin')
  } catch {}
  return { success: true }
}

// Admin Deadline Adjuster (+/- minutes)
export async function adminAdjustDeadline(roundId: string, deltaMinutes: number) {
  const supabase = createAdminClient()

  const { data: round } = await supabase
    .from('rounds')
    .select('ends_at')
    .eq('id', roundId)
    .single()

  if (!round) return { success: false, error: 'Round not found.' }

  const currentEndMs = round.ends_at ? new Date(round.ends_at).getTime() : Date.now() + 60 * 60 * 1000
  const newEndMs = currentEndMs + deltaMinutes * 60 * 1000
  const newEndsAtStr = new Date(newEndMs).toISOString()

  const { error } = await supabase
    .from('rounds')
    .update({ ends_at: newEndsAtStr })
    .eq('id', roundId)

  if (error) return { success: false, error: 'Failed to update deadline.' }

  revalidatePath('/build')
  revalidatePath('/admin')
  return { success: true, newEndsAt: newEndsAtStr }
}

// Admin Update Problem Statement
export async function adminUpdateProblemStatement(roundId: string, problemStatement: string) {
  const supabase = createAdminClient()

  const { data: round } = await supabase.from('rounds').select('config').eq('id', roundId).single()
  const currentConfig = (round?.config as any) || {}
  const newConfig = { ...currentConfig, problem_statement: problemStatement.trim() }

  const { error } = await supabase.from('rounds').update({ config: newConfig }).eq('id', roundId)
  if (error) return { success: false, error: 'Failed to update problem statement.' }

  revalidatePath('/build')
  revalidatePath('/admin')
  return { success: true }
}

// Export Submissions CSV
export async function exportSubmissionsCSV() {
  const supabase = createAdminClient()

  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      github_url,
      deploy_url,
      docs_url,
      description,
      status,
      submitted_at,
      updated_at,
      teams (
        name,
        code,
        rooms (name),
        members (name, is_leader)
      )
    `)
    .order('updated_at', { ascending: false })

  if (!submissions || submissions.length === 0) return ''

  let csv = 'Room,Team Name,Team Code,Leader,Members,GitHub Link,Deploy Link,Docs Link,Description,Status,Submitted At\n'

  for (const s of submissions) {
    const team = s.teams as any
    const roomName = team?.rooms?.name || 'Unassigned'
    const leader = team?.members?.find((m: any) => m.is_leader)?.name || 'N/A'
    const membersList = team?.members?.filter((m: any) => !m.is_leader).map((m: any) => m.name).join('; ') || ''

    const gh = s.github_url || ''
    const dep = s.deploy_url || ''
    const docs = s.docs_url || ''
    const desc = (s.description || '').replace(/"/g, '""')
    const status = s.status || 'draft'
    const subAt = s.submitted_at ? new Date(s.submitted_at).toLocaleString() : 'Draft Only'

    csv += `"${roomName}","${team?.name || ''}","${team?.code || ''}","${leader}","${membersList}","${gh}","${dep}","${docs}","${desc}","${status}","${subAt}"\n`
  }

  return csv
}
