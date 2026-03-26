import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────────────────────
// BATTLE ROOMS — Head-to-Head
// ─────────────────────────────────────────────────────────────────────────

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function createBattleRoom(hostId, topic, level, difficulty) {
  const code = randomCode()
  const { data, error } = await supabase
    .from('battle_rooms')
    .insert({ host_id: hostId, code, topic, level, difficulty, status: 'waiting' })
    .select().single()
  return { data, error }
}

export async function joinBattleRoom(guestId, code) {
  const { data: room, error: findErr } = await supabase
    .from('battle_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('status', 'waiting')
    .single()
  if (findErr || !room) return { error: 'Room not found or already started' }
  if (room.host_id === guestId) return { error: 'You cannot join your own room' }

  const { data, error } = await supabase
    .from('battle_rooms')
    .update({ guest_id: guestId, status: 'active' })
    .eq('id', room.id)
    .select().single()
  return { data, error }
}

export async function getBattleRoom(roomId) {
  const { data, error } = await supabase
    .from('battle_rooms')
    .select('*')
    .eq('id', roomId)
    .single()
  return { data, error }
}

export async function getBattleRoomByCode(code) {
  const { data, error } = await supabase
    .from('battle_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()
  return { data, error }
}

export async function saveRoomQuestions(roomId, questions) {
  const { data, error } = await supabase
    .from('battle_rooms')
    .update({ questions })
    .eq('id', roomId)
    .select().single()
  return { data, error }
}

export async function submitBattleAnswer(roomId, userId, questionIdx, answer, isCorrect, timeTaken) {
  // Upsert answer
  const { data, error } = await supabase
    .from('battle_answers')
    .upsert({
      room_id: roomId, user_id: userId,
      question_idx: questionIdx, answer, is_correct: isCorrect, time_taken: timeTaken,
    }, { onConflict: 'room_id,user_id,question_idx' })
    .select().single()
  return { data, error }
}

export async function finishBattleForPlayer(roomId, userId, isHost, score) {
  const field    = isHost ? 'host_done'  : 'guest_done'
  const scoreKey = isHost ? 'host_score' : 'guest_score'
  const { data: room } = await supabase
    .from('battle_rooms')
    .update({ [field]: true, [scoreKey]: score })
    .eq('id', roomId)
    .select().single()

  // If both done, mark winner
  if (room?.host_done && room?.guest_done) {
    const winner = room.host_score > room.guest_score  ? room.host_id
                 : room.guest_score > room.host_score  ? room.guest_id
                 : null  // tie
    await supabase.from('battle_rooms').update({
      status: 'finished',
      winner_id: winner,
      finished_at: new Date().toISOString(),
    }).eq('id', roomId)
  }
  return { data: room }
}

export async function getBattleAnswers(roomId) {
  const { data, error } = await supabase
    .from('battle_answers')
    .select('*')
    .eq('room_id', roomId)
    .order('question_idx')
  return { data, error }
}

export function subscribeToBattleRoom(roomId, callback) {
  return supabase
    .channel(`battle:${roomId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'battle_rooms', filter: `id=eq.${roomId}`
    }, callback)
    .subscribe()
}

// ─────────────────────────────────────────────────────────────────────────
// CLASS ASSIGNMENTS
// ─────────────────────────────────────────────────────────────────────────

export async function createAssignment(teacherId, classroomId, { title, topic, level, difficulty, dueDate }) {
  const { data, error } = await supabase
    .from('class_assignments')
    .insert({
      teacher_id: teacherId, classroom_id: classroomId,
      title, topic, level, difficulty,
      due_date: dueDate || null,
    })
    .select().single()
  return { data, error }
}

export async function getAssignmentsForClass(classroomId) {
  const { data, error } = await supabase
    .from('class_assignments')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function getMyAssignments(userId) {
  // Get assignments for classrooms the user is in
  const { data: memberships } = await supabase
    .from('classroom_members')
    .select('classroom_id')
    .eq('user_id', userId)
  const ids = memberships?.map(m => m.classroom_id) || []
  if (!ids.length) return { data: [], error: null }

  const { data, error } = await supabase
    .from('class_assignments')
    .select('*, classrooms(name)')
    .in('classroom_id', ids)
    .eq('status', 'active')
    .order('due_date', { ascending: true, nullsLast: true })
  return { data, error }
}

export async function submitAssignment(assignmentId, studentId, sessionId, score) {
  const { data, error } = await supabase
    .from('assignment_submissions')
    .upsert({ assignment_id: assignmentId, student_id: studentId, session_id: sessionId, score },
             { onConflict: 'assignment_id,student_id' })
    .select().single()
  return { data, error }
}

export async function getAssignmentResults(assignmentId) {
  const { data, error } = await supabase
    .from('assignment_submissions')
    .select('*, profiles!student_id(display_name, email)')
    .eq('assignment_id', assignmentId)
    .order('score', { ascending: false })
  return { data, error }
}

export async function closeAssignment(assignmentId) {
  return supabase.from('class_assignments').update({ status: 'closed' }).eq('id', assignmentId)
}

// ─────────────────────────────────────────────────────────────────────────
// STUDENT QUESTION BANK
// ─────────────────────────────────────────────────────────────────────────

export async function submitStudentQuestion({ authorId, topic, level, questionText, answerText, hint, eulerFeedback, qualityScore }) {
  // Auto-approve if quality >= 70
  const status = (qualityScore || 0) >= 70 ? 'approved' : 'pending'
  const { data, error } = await supabase
    .from('student_questions')
    .insert({ author_id: authorId, topic, level, question_text: questionText,
              answer_text: answerText, hint: hint || null,
              euler_feedback: eulerFeedback || null, quality_score: qualityScore || 0, status })
    .select().single()
  return { data, error }
}

export async function getQuestionBank(topic = null, level = null) {
  let query = supabase
    .from('student_questions')
    .select('*, profiles!author_id(display_name, email)')
    .eq('status', 'approved')
    .order('upvotes', { ascending: false })
    .limit(50)
  if (topic) query = query.eq('topic', topic)
  if (level) query = query.eq('level', level)
  const { data, error } = await query
  return { data, error }
}

export async function getMyQuestions(authorId) {
  const { data, error } = await supabase
    .from('student_questions')
    .select('*')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function upvoteQuestion(questionId, userId) {
  // Toggle upvote
  const { data: existing } = await supabase
    .from('question_upvotes')
    .select('*')
    .eq('question_id', questionId)
    .eq('user_id', userId)
    .single()

  if (existing) {
    await supabase.from('question_upvotes').delete()
      .eq('question_id', questionId).eq('user_id', userId)
    await supabase.from('student_questions')
      .update({ upvotes: supabase.rpc('decrement', { x: 1 }) })
      .eq('id', questionId)
    return { upvoted: false }
  } else {
    await supabase.from('question_upvotes').insert({ question_id: questionId, user_id: userId })
    await supabase.from('student_questions')
      .update({ upvotes: supabase.rpc('increment', { x: 1 }) })
      .eq('id', questionId)
    return { upvoted: true }
  }
}

export async function getMyUpvotes(userId) {
  const { data } = await supabase
    .from('question_upvotes')
    .select('question_id')
    .eq('user_id', userId)
  return (data || []).map(r => r.question_id)
}

// ─────────────────────────────────────────────────────────────────────────
// STRUGGLING STUDENT ALERTS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Run after every session completes.
 * Checks if the student's last 3 sessions are all below 40%.
 * If so, upserts an alert for all teachers of that student's classrooms.
 */
export async function checkAndCreateStrugglingAlert(studentId) {
  // Get the 3 most recent completed sessions
  const { data: recent } = await supabase
    .from('practice_sessions')
    .select('score, completed_at, topic')
    .eq('user_id', studentId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(3)

  if (!recent || recent.length < 3) return  // not enough data yet

  const allBelow40 = recent.every(s => (s.score || 0) < 40)
  if (!allBelow40) return  // student is fine

  // Find all classrooms this student belongs to
  const { data: memberships } = await supabase
    .from('classroom_members')
    .select('classroom_id, classrooms(teacher_id)')
    .eq('user_id', studentId)
    .eq('role', 'student')

  if (!memberships?.length) return

  const avgScore = Math.round(recent.reduce((s, r) => s + (r.score || 0), 0) / 3)
  const topicStr = [...new Set(recent.map(r => r.topic))].join(', ')

  // Upsert one alert per teacher (avoid duplicates within 24h)
  for (const m of memberships) {
    const teacherId = m.classrooms?.teacher_id
    if (!teacherId) continue
    await supabase.from('struggling_alerts').upsert({
      student_id:   studentId,
      teacher_id:   teacherId,
      classroom_id: m.classroom_id,
      avg_score:    avgScore,
      topics:       topicStr,
      session_count: 3,
      resolved:     false,
    }, { onConflict: 'student_id,teacher_id', ignoreDuplicates: false })
  }

  // Also alert linked parents
  const { data: parents } = await supabase
    .from('parent_child')
    .select('parent_id')
    .eq('child_id', studentId)
  for (const p of parents || []) {
    await supabase.from('struggling_alerts').upsert({
      student_id:   studentId,
      teacher_id:   p.parent_id,  // reuse teacher_id field for parent
      classroom_id: null,
      avg_score:    avgScore,
      topics:       topicStr,
      session_count: 3,
      resolved:     false,
    }, { onConflict: 'student_id,teacher_id', ignoreDuplicates: false })
  }
}

export async function getStrugglingAlerts(teacherOrParentId) {
  const { data, error } = await supabase
    .from('struggling_alerts')
    .select('*, profiles!student_id(display_name, email, avatar_color)')
    .eq('teacher_id', teacherOrParentId)
    .eq('resolved', false)
    .order('updated_at', { ascending: false })
  return { data: data || [], error }
}

export async function resolveAlert(alertId) {
  return supabase
    .from('struggling_alerts')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', alertId)
}
