# Hackathon Platform: Spec + Antigravity Build Guide

## 1. Overview

A web platform for a college hackathon with about 1000 participants across 10 lab rooms (about 100 people each). Teams self-register by scanning a QR code, get a unique team code, log in with it, play a live quiz (Round 1), then build a project and submit links (final round). Winners are NOT announced on the platform; results are judged later.

**Locked decisions**
- Rounds: Round 1 = Quiz, final round = Build. A middle round is optional (plan for 2 rounds, design so a 3rd can be added).
- Quiz: every team sees the same question at the same moment (Kahoot-style). 4 options, timer per question, faster correct answer = more points.
- Team score: the fastest correct answer from any member counts for the team, once per question. Members also see personal points.
- Rooms: 10 rooms, 1 facilitator each. Room leaderboard shows only that room's teams. There is also a global leaderboard tab.
- Time: 1h 40m total, may wrap up early.
- Judging: done later, outside the platform. The platform only collects and exports submissions.

## 2. Roles

| Role | Can do |
|---|---|
| Participant | Log in with team code, pick their name, play quiz, see leaderboard, submit links in build round |
| Team leader | Same as participant, plus edits the team's submission and presses Final Submit (or any member, see open items) |
| Facilitator (1 per room) | Opens/closes registration for their room, sees their room's teams and codes, fixes typos, resets a stuck member session, sees room leaderboard |
| Admin (you) | Creates event/rooms/rounds/questions, starts/pauses/skips/ends rounds, sees everything, exports CSVs, toggles leaderboard visibility |

## 3. Flows

### 3.1 Registration (QR, self-service)
1. Each room has its own registration link and QR code (`/register/<room-token>`). Print one QR per room, or show it on the projector in that room.
2. The team leader scans it, enters: team name, leader name, member names.
3. Room is assigned automatically from the QR, so nobody picks the wrong room.
4. Team name must be unique within the event. Show a clear error if taken.
5. On success the screen shows the 6-character team code in large text with "Screenshot this or tell your facilitator." The code is also visible to the facilitator in their panel.
6. Facilitator controls: open/close registration for the room, edit or delete a team, regenerate a code.

**Protection against outsiders using the QR:** the facilitator opens registration only during the registration window (10-15 min). Optional: the room QR link also needs a short room PIN that the facilitator announces in the room.

### 3.2 Login
1. Team enters code, then sees the member list and taps their own name (this identifies who answered).
2. Several devices can be logged in on one code (one per member). Same member logging in again from a new device replaces the old session, which allows recovery after a crash.
3. After login, the participant sees a waiting screen until Round 1 starts.

### 3.3 Round 1: Quiz
- Admin presses Start Round 1. Everyone sees a 5-second countdown.
- Server sends question 1 to everyone at the same moment. Each question has a time limit (default 20 s, configurable per question).
- Members tap an option. Each member can answer once per question.
- When the timer ends (or all teams have answered), the question closes automatically and the correct answer is revealed with a short leaderboard flash, then the next question starts after about 5 s.
- After the last question, teams see "Quiz complete, final standings" and the Round 2 waiting screen with a countdown.

### 3.4 Round 2 waiting
- Countdown to the build round start, set by admin. The start is still triggered manually, but the admin sets the "starts at" time shown to teams.

### 3.5 Final round: Build
- Admin presses Start. Everyone sees the problem statement (admin-editable text) and a countdown to the deadline, calculated by the server so it is identical for all.
- Submission form: GitHub repo link, deployed link (Vercel etc.), documentation/other link (optional), short description.
- Links are validated as real URLs. Teams may edit until Final Submit.
- Final Submit button: confirmation popup, then the submission locks. Admin can unlock a specific team if needed.
- At the deadline, saved-but-unsubmitted work is auto-marked "Draft (not final)" and shown that way in the export. Decide with your college whether to accept these.

## 4. Scoring (quiz)

```
if wrong or no answer: 0
if correct: points = 500 + round(500 * (time_remaining / time_limit))
```
So a correct answer instantly earns about 1000 and one at the last second about 500.

- Time is measured on the server: `answer_received_at - question_started_at`.
- Member's personal score = points from their own answers.
- Team's score for a question = the highest points among its members for that question (the fastest correct one).
- Team total = sum across questions.
- Ties are broken by total correct answers, then total response time.
- Leaderboard shows: rank, team name, team total, and expandable member points.

## 5. Leaderboards

- **Room tab:** only teams from the participant's room. This is the default tab.
- **Global tab:** all rooms. Shows team name plus room name so teams are easy to find.
- **Admin toggle:** hide or freeze leaderboards, useful since winners are not announced on the day. Default: visible during the quiz.
- Leaderboard is calculated once every 2-3 seconds and cached. Clients read the cached result. Never recalculate per user.
- Facilitator gets a projector-friendly full-screen view for their room, and admin gets one for global.

## 6. Data model

- `events` (id, name, status)
- `rooms` (id, event_id, name, registration_token, registration_open)
- `teams` (id, room_id, name, code, created_at)
- `members` (id, team_id, name, is_leader)
- `sessions` (id, member_id, device_token, last_seen)
- `rounds` (id, event_id, order, type: quiz|build, status: upcoming|live|ended, starts_at, ends_at, config json)
- `questions` (id, round_id, order, text, options[4], correct_index, time_limit)
- `question_runs` (id, question_id, started_at, closed_at)
- `answers` (id, question_run_id, member_id, team_id, option, received_at, points)
- `leaderboard_cache` (scope: room/global, room_id, payload json, updated_at)
- `submissions` (team_id, round_id, github_url, deploy_url, docs_url, description, status: draft|final, updated_at, submitted_at)

Rules: `correct_index` is never sent to participant browsers before the question closes. One answer per member per question (unique constraint).

## 7. Tech and scaling

**Stack:** Next.js + Supabase (Postgres, Realtime) + Tailwind, hosted on Vercel.

- Push "current question" and "round status" to all clients with one Realtime broadcast channel per event. Do not make every client poll the database.
- Answer submission is a single lightweight API call.
- Leaderboards are cached (see section 5).
- Check Supabase's current plan limits for concurrent connections and Realtime before the event, and upgrade for that month if needed.
- Load test with a script simulating 1000 fake users a week before.
- **Venue wifi is the biggest risk.** Test 100 phones or laptops per lab on the actual network. Have hotspots or a fallback plan. Keep the page light.

## 8. Timeline for the 100 minutes

| Segment | Time |
|---|---|
| QR registration and login | 10-15 min |
| Round 1 quiz (about 12 questions) | 12-15 min |
| Break, Round 2 countdown | 5 min |
| Build round | 50-55 min |
| Final submission buffer | 10 min |

Ask facilitators to keep registration to 15 minutes. If time runs short, admin can skip questions or shorten the build round from the admin panel.

## 9. Admin panel must-haves

- Create event, rooms (10), rounds, questions (paste or CSV import)
- Start / pause / skip / end for each round and question
- Adjust build deadline (+/- minutes) live
- Toggle leaderboard visibility
- Room facilitator accounts (email + password, or a facilitator code)
- Export CSVs: teams and codes per room (for printing), quiz results, submissions
- Live counters: teams registered per room, teams online, submissions received

## 10. Antigravity build plan

**How to use Antigravity well**
1. Start a new project, paste **Prompt 0** first, and use Planning mode so you can review the plan before code is written.
2. Do one milestone per prompt. Test each before moving on.
3. After each milestone, ask the agent to run its browser agent through the flow as a fake team.
4. Keep this file in the repo as `SPEC.md` so the agent can re-read it.

### Prompt 0: Foundation
```
Read SPEC.md fully. Create a Next.js (App Router) + TypeScript + Tailwind project using Supabase. Set up the database schema from section 6 with SQL migrations, row-level security so participants can only read their own room's data, and never expose correct_index to clients before a question closes. Give me a plan first and wait for approval. Mobile-first UI.
```

### Prompt 1: Registration and login by team code
```
Implement sections 3.1 and 3.2. Room-specific registration pages at /register/[roomToken] with team name, leader, and member names; unique team name check; generate a 6-character team code with no ambiguous characters (no 0/O/1/I/l). Login page with code, then member-name picker. Multiple devices per team allowed; a member logging in again replaces their earlier session. Add facilitator login, and a facilitator panel to open/close registration, view teams and codes, edit/delete a team, and regenerate a code.
```

### Prompt 2: Admin panel and rounds
```
Implement the admin panel from section 9 for creating rooms, rounds (quiz and build), and questions with CSV import. Add round status control (upcoming/live/ended) and the participant waiting screen with a server-synced countdown.
```

### Prompt 3: Quiz engine
```
Implement section 3.3 and section 4. The server starts each question and stores started_at; clients receive questions through a single Supabase Realtime channel. The correct answer must not be sent until the question closes. Compute points on the server using the formula in the spec. One answer per member per question. Admin can pause, skip, and end. Include the between-question reveal screen. Write unit tests for scoring, including the case where two members of a team both answer correctly.
```

### Prompt 4: Leaderboards
```
Implement section 5. A background job or scheduled function recomputes room and global leaderboards every 3 seconds during a live quiz and stores them in leaderboard_cache. The participant UI has a Room tab (default) and a Global tab that shows the room name beside each team. Teams expand to show member points. Add admin toggle to hide/freeze, and full-screen projector views for room and global.
```

### Prompt 5: Build round and submission
```
Implement section 3.5. Problem statement text, server-based countdown, submission form with URL validation for GitHub, deploy link, docs link, and description. Draft saving, Final Submit with confirmation modal that locks the submission, admin unlock per team, admin +/- minutes to deadline. Add CSV export of all submissions with room, team, members, links, status, and submitted_at.
```

### Prompt 6: Hardening
```
Write a load-test script that simulates 1000 users across 10 rooms logging in and answering a 12-question quiz within the time limits. Run it, report bottlenecks, and fix them. Add graceful reconnect handling so a refreshed browser returns to the current question, plus an offline/slow-network banner.
```

## 11. Pre-event checklist
- [ ] Load test passed, with a fresh plan tier confirmed
- [ ] Wifi tested in every lab with real devices
- [ ] 10 room QR codes printed, with a copy on each room's projector
- [ ] Facilitators trained (10-minute walkthrough) and know how to fix a typo, reset a session, and close registration
- [ ] Questions loaded and reviewed, with a dry run done
- [ ] Admin has a backup plan: paper submission or a shared form
- [ ] Decide on the policy for unsubmitted drafts

## 12. Open decisions (defaults marked)

1. **Team size:** a room of 100 with 10 team leaders suggests teams of about 10. Is that right, or will there be more teams of 3-5? Default: a configurable max team size.
2. **Who presses Final Submit:** leader only, or any member? Default: any member of the team.
3. **Global leaderboard visibility:** should students see it, or admin only? Default: visible to students as a separate tab, with the admin toggle to hide.
4. **Quiz questions:** who prepares them, and how many? Default: 12, at 20 s each.
5. **Middle round:** skipped by default. The design allows adding one.
