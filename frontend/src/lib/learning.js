import { supabase } from './supabase'

// ═══════════════════════════════════════════════════════════════════
// STREAK TRACKING
// ═══════════════════════════════════════════════════════════════════

export async function updateStreak(userId) {
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!existing) {
    const { data, error } = await supabase
      .from('user_streaks')
      .insert({ user_id: userId, current_streak: 1, longest_streak: 1, last_active_date: today })
      .select().single()
    return { data, error }
  }

  if (existing.last_active_date === today) return { data: existing, error: null }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const newStreak  = existing.last_active_date === yesterdayStr ? existing.current_streak + 1 : 1
  const newLongest = Math.max(newStreak, existing.longest_streak)

  const { data, error } = await supabase
    .from('user_streaks')
    .update({ current_streak: newStreak, longest_streak: newLongest,
              last_active_date: today, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select().single()
  return { data, error }
}

export async function getStreak(userId) {
  const { data, error } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  // Check if streak is broken
  if (data?.last_active_date) {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    if (data.last_active_date !== today && data.last_active_date !== yesterdayStr) {
      await supabase.from('user_streaks')
        .update({ current_streak: 0 }).eq('user_id', userId)
      return { data: { ...data, current_streak: 0 }, error }
    }
  }
  return { data: data || { current_streak: 0, longest_streak: 0 }, error }
}


// ═══════════════════════════════════════════════════════════════════
// TOPIC MASTERY  (extends existing topic_progress table)
// ═══════════════════════════════════════════════════════════════════

function computeMasteryLevel(avgScore) {
  if (avgScore >= 85) return 'master'
  if (avgScore >= 70) return 'proficient'
  if (avgScore >= 50) return 'developing'
  return 'beginner'
}

/**
 * Called after a session completes — updates topic_progress with
 * mastery columns (total_score, avg_score, mastery_level, sessions_done)
 * AND the existing accuracy columns (questions_attempted, questions_correct)
 */
export async function updateTopicMastery(userId, topic, level, sessionScore, questionsCorrect = 0, questionsTotal = 5) {
  const { data: existing } = await supabase
    .from('topic_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('topic', topic)
    .single()

  if (!existing) {
    const avgScore     = sessionScore
    const masteryLevel = computeMasteryLevel(avgScore)
    await supabase.from('topic_progress').insert({
      user_id:             userId,
      topic,
      level,
      times_studied:       1,
      sessions_done:       1,
      questions_attempted: questionsTotal,
      questions_correct:   questionsCorrect,
      total_score:         sessionScore,
      avg_score:           avgScore,
      mastery_level:       masteryLevel,
      last_studied_at:     new Date().toISOString(),
    })
    return
  }

  const newSessions   = (existing.sessions_done   || 0) + 1
  const newTotal      = (existing.total_score      || 0) + sessionScore
  const newAvg        = Math.round(newTotal / newSessions)
  const newMastery    = computeMasteryLevel(newAvg)
  const newAttempted  = (existing.questions_attempted || 0) + questionsTotal
  const newCorrect    = (existing.questions_correct   || 0) + questionsCorrect

  await supabase.from('topic_progress').update({
    times_studied:       (existing.times_studied || 0) + 1,
    sessions_done:       newSessions,
    questions_attempted: newAttempted,
    questions_correct:   newCorrect,
    total_score:         newTotal,
    avg_score:           newAvg,
    mastery_level:       newMastery,
    last_studied_at:     new Date().toISOString(),
  }).eq('user_id', userId).eq('topic', topic)
}

/** Get all topic mastery records (reuses topic_progress) */
export async function getTopicMastery(userId, level = null) {
  let query = supabase
    .from('topic_progress')
    .select('*')
    .eq('user_id', userId)
    .not('mastery_level', 'is', null)
    .order('avg_score', { ascending: false })

  if (level) query = query.eq('level', level)
  return query
}


// ═══════════════════════════════════════════════════════════════════
// SPACED REPETITION  (SM-2 inspired)
// ═══════════════════════════════════════════════════════════════════

export async function updateSpacedRepetition(userId, topic, level, score) {
  const { data: existing } = await supabase
    .from('spaced_repetition')
    .select('*')
    .eq('user_id', userId)
    .eq('topic', topic)
    .single()

  let easeFactor   = existing?.ease_factor   ?? 2.5
  let intervalDays = existing?.interval_days ?? 1
  let repetitions  = existing?.repetitions   ?? 0

  // SM-2 quality rating (0–5)
  const quality = score >= 80 ? 5 : score >= 70 ? 4 : score >= 60 ? 3
                : score >= 50 ? 2 : score >= 30 ? 1 : 0

  if (quality >= 3) {
    if (repetitions === 0)      intervalDays = 1
    else if (repetitions === 1) intervalDays = 6
    else                        intervalDays = Math.round(intervalDays * easeFactor)
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    repetitions++
  } else {
    repetitions  = 0
    intervalDays = 1
    easeFactor   = Math.max(1.3, easeFactor - 0.2)
  }

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + intervalDays)
  const nextReviewStr = nextReview.toISOString().split('T')[0]

  if (!existing) {
    await supabase.from('spaced_repetition').insert({
      user_id: userId, topic, level,
      ease_factor: easeFactor, interval_days: intervalDays,
      repetitions, next_review: nextReviewStr, last_score: score,
    })
    return
  }

  await supabase.from('spaced_repetition').update({
    ease_factor: easeFactor, interval_days: intervalDays,
    repetitions, next_review: nextReviewStr,
    last_score: score, updated_at: new Date().toISOString(),
  }).eq('user_id', userId).eq('topic', topic)
}

/** Topics due for review today */
export async function getDueTopics(userId) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('spaced_repetition')
    .select('*')
    .eq('user_id', userId)
    .lte('next_review', today)
    .order('next_review', { ascending: true })
  return { data: data || [], error }
}

export async function getAllRepetitionData(userId) {
  return supabase
    .from('spaced_repetition')
    .select('*')
    .eq('user_id', userId)
    .order('next_review', { ascending: true })
}
