import { createClient } from '@supabase/supabase-js'

const cleanEnvValue = (value) => {
    if (typeof value !== 'string') return value
    return value.trim().replace(/^['"`]+|['"`]+$/g, '')
}

const supabaseUrl = cleanEnvValue(import.meta.env.VITE_SUPABASE_URL)
const supabaseKey = cleanEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY)

export const API_BASE_URL = cleanEnvValue(import.meta.env.VITE_API_URL)
    || (import.meta.env.PROD ? 'https://genius-jsvm.onrender.com' : 'http://localhost:8000')

const unavailableTables = new Set()

export function isMissingRelationError(error) {
    const code = error?.code
    const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase()
    return code === 'PGRST205'
        || code === '42P01'
        || message.includes('could not find the table')
        || message.includes('relation')
        || message.includes('schema cache')
        || error?.status === 404
}

export function isTableUnavailable(table) {
    return unavailableTables.has(table)
}

export function markTableUnavailable(table, error) {
    if (!table || !isMissingRelationError(error)) return false
    unavailableTables.add(table)
    return true
}

if (!supabaseUrl || !supabaseKey || supabaseKey === 'dummy_anon_key') {
    console.error('[SUPABASE_ERROR] Missing or invalid configuration in .env')
}

if (supabaseKey?.startsWith('sb_secret_')) {
    console.error('[SUPABASE_ERROR] VITE_SUPABASE_ANON_KEY must use the public anon key, not a service key')
}

// ── Purge stale auth locks from old storage keys ───────────────────
// Old versions used 'mathgenius_auth_v1' / 'v2'. Any leftover keys in
// localStorage cause the new client to wait 10 seconds for a lock that
// will never release. We wipe them at boot time, once.
try {
    const CURRENT_KEY = 'mathgenius_auth_v4'
    Object.keys(localStorage)
        .filter(k => k.startsWith('mathgenius_auth_') && k !== CURRENT_KEY)
        .forEach(k => { localStorage.removeItem(k) })
} catch { /* Private browsing — ignore */ }

// ── Noop lock: skips the Web Locks API entirely ────────────────────
// Supabase calls this as (name, fn) OR (name, acquireTimeout, fn)
// depending on the version. We handle both signatures.
const noopLock = async (name, acquireTimeoutOrFn, fn) => {
    const callback = typeof acquireTimeoutOrFn === 'function' ? acquireTimeoutOrFn : fn
    return callback()
}

console.log('[SUPABASE_INIT] URL:', supabaseUrl)

export const supabase = createClient(
    supabaseUrl || 'http://placeholder-url',
    supabaseKey || 'placeholder-key',
    {
        auth: {
            storageKey: 'mathgenius_auth_v4',
            lock: noopLock,
            // Prevents the client from spawning a background lock on every tab focus
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        },
    }
)
