import { supabase } from './supabase'

export async function getFloatChatHistory(userId, limit = 20) {
  const { data } = await supabase
    .from('messages')
    .select('*, conversations!inner(user_id)')
    .eq('conversations.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data?.reverse() || []
}