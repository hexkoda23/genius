import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey || supabaseKey === 'dummy_anon_key') {
    console.error('[SUPABASE_ERROR] Missing or invalid configuration in .env')
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