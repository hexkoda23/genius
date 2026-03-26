import { supabase } from './supabase'

// ── Teacher: create a classroom ───────────────────────────────────
export async function createClassroom(teacherId, name, level = 'secondary') {
  const { data, error } = await supabase
    .from('classrooms')
    .insert({ teacher_id: teacherId, name, level })
    .select().single()
  return { data, error }
}

// ── Teacher: get their classrooms with member count ───────────────
export async function getMyClassrooms(teacherId) {
  const { data, error } = await supabase
    .from('classrooms')
    .select('*, classroom_members(count)')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })
  return { data, error }
}

// ── Student/Parent: join via invite code ──────────────────────────
export async function joinClassroom(userId, inviteCode) {
  const { data: classroom, error: findErr } = await supabase
    .from('classrooms')
    .select('*')
    .eq('invite_code', inviteCode.toUpperCase())
    .single()
  if (findErr || !classroom) return { error: 'Invalid invite code' }

  const { data, error } = await supabase
    .from('classroom_members')
    .insert({ classroom_id: classroom.id, user_id: userId, role: 'student' })
    .select().single()
  return { data: { ...data, classroom }, error }
}

// ── Get classrooms a user belongs to (as student) ─────────────────
export async function getJoinedClassrooms(userId) {
  const { data, error } = await supabase
    .from('classroom_members')
    .select('*, classrooms(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
  return { data, error }
}

// ── Get leaderboard for a classroom ──────────────────────────────
export async function getClassroomLeaderboard(classroomId) {
  // Get all members
  const { data: members } = await supabase
    .from('classroom_members')
    .select('user_id, profiles(id, display_name, email)')
    .eq('classroom_id', classroomId)
    .eq('role', 'student')

  if (!members?.length) return { data: [], error: null }
  const userIds = members.map(m => m.user_id)

  // Get practice stats for each member
  const { data: sessions } = await supabase
    .from('practice_sessions')
    .select('user_id, score')
    .in('user_id', userIds)
    .not('completed_at', 'is', null)

  const { data: mastery } = await supabase
    .from('topic_progress')
    .select('user_id, avg_score, mastery_level, sessions_done')
    .in('user_id', userIds)

  // Build leaderboard entries
  const board = members.map(member => {
    const uid      = member.user_id
    const userSess = sessions?.filter(s => s.user_id === uid) || []
    const userMast = mastery?.filter(m => m.user_id === uid) || []

    const avgScore     = userSess.length
      ? Math.round(userSess.reduce((s, x) => s + (x.score || 0), 0) / userSess.length) : 0
    const sessCount    = userSess.length
    const topicsMaster = userMast.filter(m => m.mastery_level === 'master').length
    const totalSessions = userMast.reduce((s, m) => s + (m.sessions_done || 0), 0)

    // Composite score: 50% avg score + 30% session count (capped 20) + 20% mastered topics
    const points = Math.round(
      avgScore * 0.5 +
      Math.min(sessCount, 20) / 20 * 30 +
      Math.min(topicsMaster, 10) / 10 * 20
    )

    return {
      userId:       uid,
      name:         member.profiles?.display_name || member.profiles?.email?.split('@')[0] || 'Student',
      avgScore,
      sessCount,
      topicsMaster,
      points,
    }
  })

  board.sort((a, b) => b.points - a.points)
  return { data: board.map((s, i) => ({ ...s, rank: i + 1 })), error: null }
}

// ── Teacher: get detailed stats per student ───────────────────────
export async function getStudentStats(studentId) {
  const [sessRes, mastRes, streakRes, srRes] = await Promise.all([
    supabase.from('practice_sessions').select('*')
      .eq('user_id', studentId).not('completed_at', 'is', null)
      .order('completed_at', { ascending: false }).limit(10),
    supabase.from('topic_progress').select('*').eq('user_id', studentId),
    supabase.from('user_streaks').select('*').eq('user_id', studentId).single(),
    supabase.from('spaced_repetition').select('*').eq('user_id', studentId),
  ])
  return {
    sessions:   sessRes.data  || [],
    mastery:    mastRes.data  || [],
    streak:     streakRes.data || { current_streak: 0 },
    repetition: srRes.data    || [],
  }
}

// ── Parent: get their children's user IDs ────────────────────────
export async function getChildren(parentId) {
  const { data, error } = await supabase
    .from('parent_child')
    .select('child_id, profiles!child_id(id, display_name, email)')
    .eq('parent_id', parentId)
  return { data, error }
}

// ── Link parent to child (by child's email) ───────────────────────
export async function linkChild(parentId, childEmail) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', childEmail)
    .single()
  if (!profile) return { error: 'No account found with that email' }

  const { data, error } = await supabase
    .from('parent_child')
    .insert({ parent_id: parentId, child_id: profile.id })
    .select().single()
  return { data, error }
}