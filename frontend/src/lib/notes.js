import { supabase } from './supabase'

export async function getNotes(userId) {
  const { data } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
  return data || []
}

export async function createNote(userId, { title, content, topic, color }) {
  const { data } = await supabase
    .from('notes')
    .insert({ user_id: userId, title, content, topic, color: color || 'yellow' })
    .select()
    .single()
  return data
}

export async function updateNote(id, updates) {
  const { data } = await supabase
    .from('notes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return data
}

export async function deleteNote(id) {
  await supabase.from('notes').delete().eq('id', id)
}

export async function togglePin(id, pinned) {
  await supabase.from('notes').update({ pinned: !pinned }).eq('id', id)
}