import { supabase } from './supabase'
import { awardXP } from './stats'

export async function getReferralCode(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('referral_code, full_name')
    .eq('id', userId)
    .single()
  return data
}

export async function getReferralStats(userId) {
  const { data, count } = await supabase
    .from('referrals')
    .select('*, referred:referred_id(full_name, created_at)', { count: 'exact' })
    .eq('referrer_id', userId)
  return { referrals: data || [], count: count || 0 }
}

export async function applyReferralCode(userId, code) {
  // Find the referrer
  const { data: referrer } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', code.toUpperCase())
    .single()

  if (!referrer) return { error: 'Invalid referral code' }
  if (referrer.id === userId) return { error: 'Cannot use your own referral code' }

  // Check not already referred
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_id', userId)
    .single()

  if (existing) return { error: 'You have already used a referral code' }

  // Create referral record
  await supabase.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: userId,
  })

  // Award XP to both
  await Promise.all([
    awardXP(referrer.id, 100, 'referral_bonus'),
    awardXP(userId, 50, 'referred_bonus'),
  ])

  // Mark profiles
  await supabase
    .from('profiles')
    .update({ referred_by: code.toUpperCase() })
    .eq('id', userId)

  return { success: true }
}

export function getReferralLink(code) {
  return `${window.location.origin}/signup?ref=${code}`
}