import { isTableUnavailable, markTableUnavailable, supabase } from './supabase'

export async function getNotifications(userId) {
  if (!userId || isTableUnavailable('notifications')) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (markTableUnavailable('notifications', error)) return []
  return data || []
}

export async function markAllRead(userId) {
  if (!userId || isTableUnavailable('notifications')) return
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
  markTableUnavailable('notifications', error)
}

export async function markOneRead(id) {
  if (!id || isTableUnavailable('notifications')) return
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
  markTableUnavailable('notifications', error)
}

export async function deleteNotification(id) {
  if (!id || isTableUnavailable('notifications')) return
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  markTableUnavailable('notifications', error)
}

export async function createNotification(userId, { type, title, message, icon, link }) {
  if (!userId || isTableUnavailable('notifications')) return
  const { error } = await supabase.from('notifications').insert({
    user_id: userId, type, title, message, icon: icon || '🔔', link,
  })
  markTableUnavailable('notifications', error)
}

export async function getUnreadCount(userId) {
  if (!userId || isTableUnavailable('notifications')) return 0
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
  if (markTableUnavailable('notifications', error)) return 0
  return count || 0
}
