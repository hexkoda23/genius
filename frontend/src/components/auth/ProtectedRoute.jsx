import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // For already-logged-in users, loading is false immediately (cached session).
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-paper)] flex flex-col items-center justify-center p-8 text-center animate-pulse">
        <div className="w-16 h-16 rounded-3xl bg-[var(--color-teal)]/10 flex items-center justify-center mb-6">
          <div className="w-8 h-8 rounded-full border-4 border-[var(--color-teal)] border-t-transparent animate-spin" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--color-muted)]">Authorizing Access...</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/" replace />
  return children
}