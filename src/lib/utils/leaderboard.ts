// Leaderboard computation engine following SPEC.md Section 4 & Section 5

export interface RawAnswer {
  id: string
  question_run_id: string
  member_id: string
  team_id: string
  option: number
  points: number
  received_at: string
}

export interface RawMember {
  id: string
  team_id: string
  name: string
  is_leader: boolean
}

export interface RawTeam {
  id: string
  room_id: string
  name: string
  code: string
  rooms?: { name: string } | { name: string }[] | null
}

export interface MemberLeaderboardItem {
  id: string
  name: string
  isLeader: boolean
  personalPoints: number
  correctAnswersCount: number
}

export interface TeamLeaderboardItem {
  rank: number
  teamId: string
  teamName: string
  teamCode: string
  roomId: string
  roomName: string
  totalScore: number
  totalCorrectAnswers: number
  totalResponseTimeSeconds: number
  members: MemberLeaderboardItem[]
}

export function computeLeaderboardsPayload(
  teams: RawTeam[],
  members: RawMember[],
  answers: RawAnswer[]
): {
  globalLeaderboard: TeamLeaderboardItem[]
  roomLeaderboards: Record<string, TeamLeaderboardItem[]>
} {
  // 1. Group members by team
  const membersByTeam: Record<string, RawMember[]> = {}
  for (const m of members) {
    if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = []
    membersByTeam[m.team_id].push(m)
  }

  // 2. Group answers by team and question_run_id
  const teamQuestionAnswers: Record<string, Record<string, RawAnswer[]>> = {}
  const memberAnswersMap: Record<string, RawAnswer[]> = {}

  for (const a of answers) {
    if (!memberAnswersMap[a.member_id]) memberAnswersMap[a.member_id] = []
    memberAnswersMap[a.member_id].push(a)

    if (!teamQuestionAnswers[a.team_id]) teamQuestionAnswers[a.team_id] = {}
    if (!teamQuestionAnswers[a.team_id][a.question_run_id]) {
      teamQuestionAnswers[a.team_id][a.question_run_id] = []
    }
    teamQuestionAnswers[a.team_id][a.question_run_id].push(a)
  }

  // 3. Compute score for each team
  const computedTeams: TeamLeaderboardItem[] = teams.map((team) => {
    const teamMembers = membersByTeam[team.id] || []
    const roomName = Array.isArray(team.rooms)
      ? team.rooms[0]?.name || 'Lab Room'
      : (team.rooms as any)?.name || 'Lab Room'

    // Member personal points
    const memberItems: MemberLeaderboardItem[] = teamMembers.map((m) => {
      const mAnswers = memberAnswersMap[m.id] || []
      const personalPoints = mAnswers.reduce((sum, ans) => sum + (ans.points || 0), 0)
      const correctCount = mAnswers.filter((ans) => (ans.points || 0) > 0).length
      return {
        id: m.id,
        name: m.name,
        isLeader: m.is_leader,
        personalPoints,
        correctAnswersCount: correctCount,
      }
    })

    // Team score per question_run = highest member points for that question
    const qRuns = teamQuestionAnswers[team.id] || {}
    let totalScore = 0
    let totalCorrectAnswers = 0
    let totalResponseTimeSeconds = 0

    for (const qRunId in qRuns) {
      const qAnsList = qRuns[qRunId]
      let maxPointsForQ = 0
      let hasCorrect = false

      for (const ans of qAnsList) {
        if (ans.points > maxPointsForQ) {
          maxPointsForQ = ans.points
        }
        if (ans.points > 0) {
          hasCorrect = true
        }
      }

      totalScore += maxPointsForQ
      if (hasCorrect) totalCorrectAnswers++
    }

    return {
      rank: 0,
      teamId: team.id,
      teamName: team.name,
      teamCode: team.code,
      roomId: team.room_id,
      roomName,
      totalScore,
      totalCorrectAnswers,
      totalResponseTimeSeconds,
      members: memberItems.sort((a, b) => b.personalPoints - a.personalPoints),
    }
  })

  // 4. Sort function: totalScore desc, then totalCorrectAnswers desc
  const sortTeams = (items: TeamLeaderboardItem[]) => {
    return items
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
        return b.totalCorrectAnswers - a.totalCorrectAnswers
      })
      .map((item, index) => ({ ...item, rank: index + 1 }))
  }

  const globalLeaderboard = sortTeams(computedTeams)

  // 5. Group by room
  const roomLeaderboards: Record<string, TeamLeaderboardItem[]> = {}
  for (const item of globalLeaderboard) {
    if (!roomLeaderboards[item.roomId]) roomLeaderboards[item.roomId] = []
    roomLeaderboards[item.roomId].push(item)
  }

  // Re-rank within each room
  for (const roomId in roomLeaderboards) {
    roomLeaderboards[roomId] = sortTeams(roomLeaderboards[roomId])
  }

  return { globalLeaderboard, roomLeaderboards }
}
