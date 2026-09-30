import { calculateMemberPoints, calculateTeamQuestionScore } from './scoring'

// Lightweight unit test runner to verify scoring logic
export function runScoringUnitTests() {
  const results: { testName: string; passed: boolean; details: string }[] = []

  function assertEqual(testName: string, actual: any, expected: any) {
    const passed = JSON.stringify(actual) === JSON.stringify(expected)
    results.push({
      testName,
      passed,
      details: passed ? `Passed (${JSON.stringify(actual)})` : `Failed: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    })
  }

  // Test 1: Wrong answer returns 0
  assertEqual('Wrong Answer Score', calculateMemberPoints({ isCorrect: false, timeLimitSeconds: 20, elapsedSeconds: 2 }), 0)

  // Test 2: Instant correct answer (0s elapsed) returns 1000
  assertEqual('Instant Correct Answer (0s)', calculateMemberPoints({ isCorrect: true, timeLimitSeconds: 20, elapsedSeconds: 0 }), 1000)

  // Test 3: Half-time correct answer (10s elapsed on 20s limit) returns 750
  assertEqual('Half-Time Correct Answer (10s/20s)', calculateMemberPoints({ isCorrect: true, timeLimitSeconds: 20, elapsedSeconds: 10 }), 750)

  // Test 4: Last second correct answer (20s elapsed on 20s limit) returns 500
  assertEqual('Last Second Correct Answer (20s/20s)', calculateMemberPoints({ isCorrect: true, timeLimitSeconds: 20, elapsedSeconds: 20 }), 500)

  // Test 5: Two team members both answer correctly -> Team gets highest/fastest score
  const twoMemberAnswers = [
    { memberId: 'member-slow', isCorrect: true, points: 750, receivedAt: '2026-09-28T12:00:10Z' },
    { memberId: 'member-fast', isCorrect: true, points: 950, receivedAt: '2026-09-28T12:00:02Z' },
  ]
  const teamResult = calculateTeamQuestionScore(twoMemberAnswers)
  assertEqual('Two Members Correct (Team Score = Max Points)', teamResult.teamScore, 950)
  assertEqual('Two Members Correct (Fastest Member ID)', teamResult.fastestMemberId, 'member-fast')

  // Test 6: One member wrong, one member correct -> Team gets correct member's points
  const mixedAnswers = [
    { memberId: 'member-wrong', isCorrect: false, points: 0, receivedAt: '2026-09-28T12:00:01Z' },
    { memberId: 'member-correct', isCorrect: true, points: 880, receivedAt: '2026-09-28T12:00:05Z' },
  ]
  const mixedResult = calculateTeamQuestionScore(mixedAnswers)
  assertEqual('Mixed Answers (Team Score = Correct Points)', mixedResult.teamScore, 880)

  return results
}

// Node script execution if executed directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('scoring.test')) {
  console.log('--- RUNNING QUIZ SCORING UNIT TESTS ---')
  const testResults = runScoringUnitTests()
  let allPassed = true
  testResults.forEach(r => {
    console.log(`${r.passed ? '✓' : '✗'} [${r.testName}]: ${r.details}`)
    if (!r.passed) allPassed = false
  })
  if (!allPassed) process.exit(1)
  console.log('--- ALL SCORING UNIT TESTS PASSED ---')
}
