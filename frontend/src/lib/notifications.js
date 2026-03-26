import { supabase } from './supabase'

export async function getNotifications(userId) {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  return data || []
}

export async function markAllRead(userId) {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
}

export async function markOneRead(id) {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
}

export async function deleteNotification(id) {
  await supabase.from('notifications').delete().eq('id', id)
}

export async function createNotification(userId, { type, title, message, icon, link }) {
  await supabase.from('notifications').insert({
    user_id: userId, type, title, message, icon: icon || '🔔', link,
  })
}

export async function getUnreadCount(userId) {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
  return count || 0
}