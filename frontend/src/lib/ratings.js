import { supabase } from './supabase'

export async function saveRating({ userId, type, rating, comment, context }) {
  const { data, error } = await supabase
    .from('ratings')
    .insert({ user_id: userId, type, rating, comment, context })
    .select()
    .single()
  return { data, error }
}

export async function getAppRatingStats() {
  const { data } = await supabase
    .from('ratings')
    .select('rating')
    .eq('type', 'app')

  if (!data?.length) return { avg: 0, count: 0 }
  const avg = data.reduce((s, r) => s + r.rating, 0) / data.length
  return { avg: Math.round(avg * 10) / 10, count: data.length }
}