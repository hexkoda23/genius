import { supabase } from './supabase'

// ── Create a new conversation ─────────────────────────────
export async function createConversation(userId, topic, level) {
  const title = topic || 'New Conversation'
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title, topic, level })
    .select()
    .single()
  return { data, error }
}

// ── Get all conversations for a user ─────────────────────
export async function getConversations(userId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
  return { data, error }
}

// ── Get messages for a conversation ──────────────────────
export async function getMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  return { data, error }
}

// ── Save a message ────────────────────────────────────────
export async function saveMessage(conversationId, role, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role, content })
    .select()
    .single()

  // Update conversation's updated_at
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  return { data, error }
}

// ── Rename a conversation ─────────────────────────────────
export async function renameConversation(conversationId, title) {
  const { data, error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', conversationId)
    .select()
    .single()
  return { data, error }
}

// ── Soft delete a conversation ────────────────────────────
export async function deleteConversation(conversationId) {
  const { error } = await supabase
    .from('conversations')
    .update({ is_deleted: true })
    .eq('id', conversationId)
  return { error }
}

// ── Format conversation for copy/print ───────────────────
export function formatConversationAsText(conversation, messages) {
  const lines = [
    `MathGenius — Conversation Export`,
    `Topic: ${conversation.topic || 'General'}`,
    `Date:  ${new Date(conversation.created_at).toLocaleDateString()}`,
    `${'─'.repeat(50)}`,
    '',
  ]
  messages.forEach(msg => {
    const speaker = msg.role === 'user' ? 'You' : 'Euler'
    lines.push(`${speaker}:`)
    lines.push(msg.content)
    lines.push('')
  })
  return lines.join('\n')
}