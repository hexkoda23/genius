import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

// Read the cached session from localStorage synchronously so we can
// skip the full-screen spinner for already-logged-in users.
function getCachedUser() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes('mathgenius_auth_v4')) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const parsed = JSON.parse(raw)
          return parsed?.user ?? null
        }
      }
    }
  } catch { /* ignore */ }
  return null
}

export function AuthProvider({ children }) {
  // Start with the cached user so protected pages render immediately
  const [user, setUser] = useState(() => getCachedUser())
  const [profile, setProfile] = useState(null)
  // If we already have a cached user, skip the initial loading state
  const [loading, setLoading] = useState(() => getCachedUser() === null)

  useEffect(() => {
    // Hard timeout: if loading is still true after 4s something is stuck
    const loadingTimeout = setTimeout(() => {
      setLoading(false)
    }, 4000)

    // Confirm/refresh session in the background
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(loadingTimeout)
        setUser(session?.user ?? null)
        if (session?.user) fetchProfile(session.user.id)
        else setLoading(false)
      })
      .catch(() => {
        clearTimeout(loadingTimeout)
        setUser(null)
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
          if (event === 'SIGNED_IN') {
            window.location.href = '/dashboard'
          }
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => {
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [])


  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error) setProfile(data)
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates) => {
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (!error) setProfile(data)
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    window.location.replace('/')
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signOut,
      updateProfile,
      fetchProfile: () => fetchProfile(user?.id)
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
