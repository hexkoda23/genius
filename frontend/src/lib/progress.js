import { supabase } from './supabase'

export async function updateTopicProgress(userId, topic, level, correct) {
  const { data: existing } = await supabase
    .from('topic_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('topic', topic)
    .single()

  if (existing) {
    await supabase
      .from('topic_progress')
      .update({
        times_studied:       existing.times_studied + 1,
        questions_attempted: existing.questions_attempted + 1,
        questions_correct:   existing.questions_correct + (correct ? 1 : 0),
        last_studied_at:     new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('topic_progress')
      .insert({
        user_id:             userId,
        topic,
        level,
        times_studied:       1,
        questions_attempted: 1,
        questions_correct:   correct ? 1 : 0,
      })
  }
}

export async function getTopicProgress(userId) {
  const { data, error } = await supabase
    .from('topic_progress')
    .select('*')
    .eq('user_id', userId)
    .order('last_studied_at', { ascending: false })
  return { data, error }
}

export async function getDashboardStats(userId) {
  const [progressRes, sessionsRes, bookmarksRes, conversationsRes, streakRes, srRes] =
    await Promise.all([
      supabase.from('topic_progress').select('*').eq('user_id', userId),
      supabase.from('practice_sessions')
        .select('*, practice_attempts(*)')
        .eq('user_id', userId)
        .not('completed_at', 'is', null),
      supabase.from('bookmarks').select('id').eq('user_id', userId),
      supabase.from('conversations').select('id').eq('user_id', userId).eq('is_deleted', false),
      // NEW: streak
      supabase.from('user_streaks').select('*').eq('user_id', userId).single(),
      // NEW: due for review today
      supabase.from('spaced_repetition')
        .select('*')
        .eq('user_id', userId)
        .lte('next_review', new Date().toISOString().split('T')[0])
        .order('next_review', { ascending: true }),
    ])

  const progress      = progressRes.data      || []
  const sessions      = sessionsRes.data       || []
  const bookmarks     = bookmarksRes.data      || []
  const conversations = conversationsRes.data  || []
  const streak        = streakRes.data         || { current_streak: 0, longest_streak: 0 }
  const dueTopics     = srRes.data             || []

  // ── Basic accuracy stats ──────────────────────────────────────────
  const totalAttempted = progress.reduce((s, t) => s + (t.questions_attempted || 0), 0)
  const totalCorrect   = progress.reduce((s, t) => s + (t.questions_correct   || 0), 0)
  const accuracy       = totalAttempted > 0
    ? Math.round((totalCorrect / totalAttempted) * 100) : 0

  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((s, sess) => s + (sess.score || 0), 0) / sessions.length) : 0

  // ── Mastery breakdown ─────────────────────────────────────────────
  const masteryBreakdown = {
    master:     progress.filter(t => t.mastery_level === 'master').length,
    proficient: progress.filter(t => t.mastery_level === 'proficient').length,
    developing: progress.filter(t => t.mastery_level === 'developing').length,
    beginner:   progress.filter(t => t.mastery_level === 'beginner' || !t.mastery_level).length,
  }

  // ── Weak topics — < 50% accuracy, attempted at least 2 sessions ──
  const weakTopics = progress
    .filter(t => (t.sessions_done || t.times_studied || 0) >= 2 &&
      (t.questions_attempted > 0) &&
      (t.questions_correct / t.questions_attempted) < 0.5)
    .sort((a, b) =>
      (a.questions_correct / a.questions_attempted) -
      (b.questions_correct / b.questions_attempted))
    .slice(0, 5)

  // ── Strong topics — 80%+ accuracy ────────────────────────────────
  const strongTopics = progress
    .filter(t => t.questions_attempted >= 2 &&
      (t.questions_correct / t.questions_attempted) >= 0.8)
    .slice(0, 5)

  // ── Check if streak is broken ─────────────────────────────────────
  let currentStreak = streak.current_streak
  if (streak.last_active_date) {
    const today     = new Date().toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    if (streak.last_active_date !== today && streak.last_active_date !== yesterdayStr) {
      currentStreak = 0
    }
  }

  return {
    // existing fields — unchanged so Dashboard doesn't break
    topicsStudied:     progress.length,
    totalAttempted,
    totalCorrect,
    accuracy,
    avgScore,
    practiceCount:     sessions.length,
    bookmarkCount:     bookmarks.length,
    conversationCount: conversations.length,
    weakTopics,
    strongTopics,
    recentProgress:    progress.slice(0, 8),
    recentSessions:    sessions.slice(0, 5),
    // NEW fields
    streak: {
      current:  currentStreak,
      longest:  streak.longest_streak || 0,
      lastDate: streak.last_active_date,
    },
    masteryBreakdown,
    dueTopics,
    topicsMastered: masteryBreakdown.master,
  }
}