// Quiz Scoring Formula according to SPEC.md section 4:
// If wrong or no answer: 0 points
// If correct: points = 500 + round(500 * (time_remaining / time_limit))

export interface ScoringInput {
  isCorrect: boolean
  timeLimitSeconds: number
  elapsedSeconds: number
}

export function calculateMemberPoints({ isCorrect, timeLimitSeconds, elapsedSeconds }: ScoringInput): number {
  if (!isCorrect) return 0

  const timeLimit = Math.max(1, timeLimitSeconds)
  const elapsed = Math.max(0, elapsedSeconds)
  const timeRemaining = Math.max(0, timeLimit - elapsed)

  const points = 500 + Math.round(500 * (timeRemaining / timeLimit))
  return Math.min(1000, Math.max(500, points))
}

export interface MemberAnswer {
  memberId: string
  isCorrect: boolean
  points: number
  receivedAt: string
}

export function calculateTeamQuestionScore(memberAnswers: MemberAnswer[]): {
  teamScore: number
  fastestMemberId: string | null
} {
  const correctAnswers = memberAnswers.filter(a => a.isCorrect && a.points > 0)
  if (correctAnswers.length === 0) {
    return { teamScore: 0, fastestMemberId: null }
  }

  // Find maximum points earned by any team member for this question
  let maxPoints = 0
  let fastestMemberId: string | null = null

  for (const answer of correctAnswers) {
    if (answer.points > maxPoints) {
      maxPoints = answer.points
      fastestMemberId = answer.memberId
    }
  }

  return { teamScore: maxPoints, fastestMemberId }
}
