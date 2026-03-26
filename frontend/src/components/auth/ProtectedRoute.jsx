import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // For already-logged-in users, loading is false immediately (cached session).
  // This spinner only appears on the very first ever page load before localStorage is set.
  if (loading) {
    return (
      <div className="fixed inset-x-0 top-0 z-50">
        <div className="h-0.5 bg-[var(--color-teal)] animate-pulse w-2/3 mx-auto" />
      </div>
    )
  }

  if (!user) return <Navigate to="/" replace />
  return children
}