import { supabase } from './supabase'

export function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export function getWeekDays(weekStart) {
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

export async function getOrCreateGoal(userId, weekStart) {
  const { data } = await supabase
    .from('study_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .single()

  if (data) return data

  const { data: newGoal } = await supabase
    .from('study_goals')
    .insert({ user_id: userId, week_start: weekStart, daily_target: 30 })
    .select()
    .single()
  return newGoal
}

export async function updateGoal(id, updates) {
  const { data } = await supabase
    .from('study_goals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return data
}

export async function getWeekSessions(userId, weekStart) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const { data } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', weekStart)
    .lte('date', weekEnd.toISOString().split('T')[0])
  return data || []
}

export async function logSession(userId, { minutes, activity }) {
  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  if (existing) {
    await supabase
      .from('study_sessions')
      .update({ minutes: existing.minutes + minutes, activity })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('study_sessions')
      .insert({ user_id: userId, date: today, minutes, activity })
  }
}

export async function getAIStudyPlan(topics, weakTopics, dailyMins, examDate) {
  const prompt = `You are a Nigerian mathematics exam coach helping a student prepare for WAEC/JAMB.

Student info:
- Daily study time available: ${dailyMins} minutes
- Exam date: ${examDate || 'not specified'}
- Topics to cover: ${topics.join(', ') || 'all mathematics topics'}
- Weak topics needing extra work: ${weakTopics.join(', ') || 'none identified yet'}

Create a focused 7-day study plan. For each day provide:
1. Main topic to study
2. Specific subtopics to focus on
3. Recommended activity (teach/practice/CBT)
4. Time allocation

Respond in this exact JSON format (no markdown, no extra text):
{
  "summary": "One sentence motivational overview",
  "days": [
    {
      "day": "Monday",
      "date_offset": 0,
      "topic": "Topic name",
      "subtopics": ["subtopic 1", "subtopic 2"],
      "activity": "teach|practice|cbt",
      "minutes": 30,
      "tip": "Quick study tip for this topic"
    }
  ]
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  const text = data.content?.[0]?.text || '{}'
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return null
  }
}