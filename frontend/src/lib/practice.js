import { supabase } from './supabase'

export async function createSession(userId, topic, level, difficulty) {
  const { data, error } = await supabase
    .from('practice_sessions')
    .insert({
      user_id:    userId,
      topic,
      level,
      difficulty,
      status:     'ongoing',
      started_at: new Date().toISOString(),
    })
    .select()
    .single()
  return { data, error }
}

export async function saveAttempt(sessionId, {
  questionText, studentAnswer, correctAnswer, isCorrect, feedback, timeTaken
}) {
  const { data, error } = await supabase
    .from('practice_attempts')
    .insert({
      session_id:      sessionId,
      question_text:   questionText,
      student_answer:  studentAnswer,
      correct_answer:  correctAnswer,
      is_correct:      isCorrect,
      feedback,
      time_taken_secs: timeTaken || 0,
    })
  return { data, error }
}

export async function completeSession(sessionId, score) {
  const { data, error } = await supabase
    .from('practice_sessions')
    .update({
      status:       'completed',
      score,
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single()
  return { data, error }
}

export async function getSessionHistory(userId) {
  const { data, error } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20)
  return { data, error }
}