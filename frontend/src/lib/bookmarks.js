import { supabase } from './supabase'

export async function saveBookmark({ userId, type, title, content, expression, result, topic }) {
  const { data, error } = await supabase
    .from('bookmarks')
    .insert({ user_id: userId, type, title, content, expression, result, topic })
    .select()
    .single()
  return { data, error }
}

export async function getBookmarks(userId) {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function deleteBookmark(bookmarkId) {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('id', bookmarkId)
  return { error }
}