import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

const ThemeContext = createContext({})

export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const [theme, setTheme] = useState(
    () => localStorage.getItem('mg_theme') || 'light'
  )

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('mg_theme', theme)
  }, [theme])

  // Sync from profile on login
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('theme')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.theme) setTheme(data.theme)
      })
  }, [user])

  const toggleTheme = async () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    if (user) {
      await supabase
        .from('profiles')
        .update({ theme: next })
        .eq('id', user.id)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)