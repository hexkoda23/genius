import { supabase } from './supabase'

// ── XP values ─────────────────────────────────────────────
export const XP = {
  CBT_CORRECT: 10,
  CBT_COMPLETE: 50,
  PRACTICE_Q: 5,
  TEACH_SESSION: 20,
  STREAK_BONUS: 25,
  PERFECT_SCORE: 100,
  DAILY_CHALLENGE: 50,
}

// ── Badges ────────────────────────────────────────────────
export const BADGES = [
  { id: 'first_exam', emoji: '🎯', label: 'First Exam', desc: 'Completed your first CBT' },
  { id: 'streak_3', emoji: '🔥', label: '3-Day Streak', desc: '3 days in a row' },
  { id: 'streak_7', emoji: '⚡', label: 'Week Warrior', desc: '7 days in a row' },
  { id: 'streak_30', emoji: '👑', label: 'Monthly Master', desc: '30 days in a row' },
  { id: 'perfect', emoji: '💯', label: 'Perfect Score', desc: 'Got 100% in a CBT exam' },
  { id: 'century', emoji: '🏆', label: 'Century', desc: 'Answered 100 questions correctly' },
  { id: 'level_5', emoji: '⭐', label: 'Rising Star', desc: 'Reached Level 5' },
  { id: 'level_10', emoji: '🌟', label: 'Expert', desc: 'Reached Level 10' },
  { id: 'speed_demon', emoji: '⚡', label: 'Speed Demon', desc: 'Finished exam with 10+ mins to spare' },
  { id: 'consistent', emoji: '📚', label: 'Consistent', desc: 'Completed 10 CBT exams' },
]

// ── XP Utilities ──────────────────────────────────────────
export function xpToLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100)) + 1
}

export function xpForNextLevel(level) {
  return level * level * 100
}

export function xpProgress(xp) {
  const level = xpToLevel(xp)
  const current = (level - 1) * (level - 1) * 100
  const next = xpForNextLevel(level)
  const progress = Math.round(((xp - current) / (next - current)) * 100)

  return {
    level,
    progress: Math.max(0, Math.min(progress, 100)),
    current: xp - current,
    needed: next - current,
  }
}

// ── Get or Create Stats ───────────────────────────────────
export async function getUserStats(userId) {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    const { data: newStats } = await supabase
      .from('user_stats')
      .insert({ user_id: userId })
      .select()
      .single()

    return newStats
  }

  return data
}

// ── Award XP ──────────────────────────────────────────────
export async function awardXP(userId, amount, reason = 'general') {
  if (!amount || amount <= 0) return null

  const stats = await getUserStats(userId)
  if (!stats) return null

  const newXP = (stats.xp || 0) + amount
  const newLevel = xpToLevel(newXP)

  const badges = [...(stats.badges || [])]
  const newBadges = []

  if (newLevel >= 5 && !badges.includes('level_5')) {
    badges.push('level_5')
    newBadges.push('level_5')
  }

  if (newLevel >= 10 && !badges.includes('level_10')) {
    badges.push('level_10')
    newBadges.push('level_10')
  }

  const { data } = await supabase
    .from('user_stats')
    .update({
      xp: newXP,
      level: newLevel,
      badges,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()

  return { stats: data, newBadges, xpGained: amount }
}

// ── Update Streak ─────────────────────────────────────────
export async function updateStreak(userId) {
  const stats = await getUserStats(userId)
  if (!stats) return null

  const today = new Date().toISOString().split('T')[0]
  const lastDate = stats.last_active_date
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString()
    .split('T')[0]

  let newStreak = stats.streak_current || 0
  const badges = [...(stats.badges || [])]
  const newBadges = []

  if (lastDate === today) {
    return { stats, newBadges: [], streakIncreased: false }
  } else if (lastDate === yesterday) {
    newStreak += 1
  } else {
    newStreak = 1
  }

  const bestStreak = Math.max(newStreak, stats.streak_best || 0)

  if (newStreak >= 3 && !badges.includes('streak_3')) {
    badges.push('streak_3')
    newBadges.push('streak_3')
  }

  if (newStreak >= 7 && !badges.includes('streak_7')) {
    badges.push('streak_7')
    newBadges.push('streak_7')
  }

  if (newStreak >= 30 && !badges.includes('streak_30')) {
    badges.push('streak_30')
    newBadges.push('streak_30')
  }

  if (newStreak > 1) {
    await awardXP(userId, XP.STREAK_BONUS, 'streak_bonus')
  }

  const { data } = await supabase
    .from('user_stats')
    .update({
      streak_current: newStreak,
      streak_best: bestStreak,
      last_active_date: today,
      badges,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()

  return { stats: data, newBadges, streakIncreased: true, newStreak }
}

// ── Record CBT Result ─────────────────────────────────────
export async function recordCBTResult(userId, { score, total }) {
  const stats = await getUserStats(userId)
  if (!stats) return null

  const pct = Math.round((score / total) * 100)

  let xpGained = score * XP.CBT_CORRECT + XP.CBT_COMPLETE
  if (pct === 100) xpGained += XP.PERFECT_SCORE

  const newCorrect = (stats.total_correct || 0) + score
  const newAttempted = (stats.total_attempted || 0) + total
  const newSessions = (stats.total_sessions || 0) + 1

  const result = await awardXP(userId, xpGained, 'cbt_complete')

  await supabase
    .from('user_stats')
    .update({
      total_correct: newCorrect,
      total_attempted: newAttempted,
      total_sessions: newSessions,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  return { ...result, percentage: pct }
}

// ── Leaderboard ───────────────────────────────────────────
export async function getLeaderboard() {
  const { data } = await supabase
    .from('user_stats')
    .select('user_id, xp, level')
    .order('xp', { ascending: false })
    .limit(20)

  return data || []
}

// ── Topic Mastery ─────────────────────────────────────────
export async function getTopicMastery(userId) {
  const { data, error } = await supabase
    .from('user_topic_mastery')
    .select('topic, correct, attempted')
    .eq('user_id', userId)

  if (error || !data) return []

  return data.map((row) => {
    const mastery =
      row.attempted > 0
        ? Math.round((row.correct / row.attempted) * 100)
        : 0

    return {
      topic: row.topic,
      mastery,
      correct: row.correct,
      attempted: row.attempted,
    }
  })
}