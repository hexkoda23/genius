import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from '../NotificationBell'
import ThemeToggle from '../common/ThemeToggle'
import { getStreak } from '../../lib/learning'
import { useScrollY } from '../../hooks/useScrollY'

const NAV_LINKS = [
  { path: '/home', label: 'Home', auth: false },
  { path: '/solve', label: 'Solver', auth: false },
  { path: '/teach', label: 'Tutor', auth: true },
  { path: '/cbt', label: 'CBT', auth: true },
  { path: '/dashboard', label: 'Dashboard', auth: true },
]

export default function Header() {
  const location = useLocation(); const navigate = useNavigate(); const scrollY = useScrollY()
  const { user, profile, signOut } = useAuth(); const [menuOpen, setMenuOpen] = useState(false); const [userMenu, setUserMenu] = useState(false)
  const dropdownRef = useRef(null)

  const isScrolled = scrollY > 40
  const active = (path) => location.pathname === path

  useEffect(() => { if (!user) return; getStreak(user.id).then(({ data }) => { }) }, [user])
  useEffect(() => {
    const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setUserMenu(false) }
    if (userMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userMenu])
  useEffect(() => { setMenuOpen(false); setUserMenu(false) }, [location.pathname])

  const handleSignOut = async () => { await signOut(); setMenuOpen(false); setUserMenu(false); navigate('/') }
  const visibleLinks = NAV_LINKS.filter(l => !l.auth || user)
  const isTeacherOrParent = profile?.role === 'teacher' || profile?.role === 'parent'

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b 
                         ${isScrolled ? 'bg-[var(--color-paper)]/80 backdrop-blur-md border-[var(--color-border)] py-3 shadow-sm' : 'bg-transparent border-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-extrabold text-2xl tracking-tight text-[var(--color-ink)]">
              Math<span className="text-[var(--color-teal)]">Genius</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {visibleLinks.map(link => (
              <Link key={link.path} to={link.path}
                className={`text-sm font-bold transition-all
                  ${active(link.path) ? 'text-[var(--color-teal)] underline underline-offset-8 decoration-2' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden md:block"><ThemeToggle /></div>

            {user ? (
              <div className="flex items-center gap-4">
                <NotificationBell />
                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setUserMenu(m => !m)} className="flex items-center transition-transform hover:scale-105">
                    <div className="w-10 h-10 rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-ink)] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      {profile?.full_name?.[0] || user.email[0]}
                    </div>
                  </button>

                  {userMenu && (
                    <div className="absolute right-0 top-full mt-4 w-64 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden z-50 animate-fade-in">
                      <div className="p-5 border-b border-[var(--color-border)] bg-[var(--color-cream)]">
                        <p className="text-sm font-bold text-[var(--color-ink)] truncate">{profile?.full_name || 'Student'}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] truncate mt-1">{user.email}</p>
                      </div>
                      <div className="py-2">
                        {[
                          { path: '/profile', label: 'My Profile' },
                          { path: '/dashboard', label: 'Analytics' },
                          { path: '/past-questions', label: 'Past Papers' },
                          { path: '/leaderboard', label: 'Leaderboard' },
                          ...(isTeacherOrParent ? [{ path: '/monitor', label: 'Student Monitor' }] : []),
                        ].map(item => (
                          <Link key={item.path} to={item.path} className="flex h-11 items-center px-5 text-sm font-bold text-[var(--color-muted)] hover:bg-[var(--color-cream)] hover:text-[var(--color-ink)] transition-colors">
                            {item.label}
                          </Link>
                        ))}
                      </div>
                      <div className="p-4 border-t border-[var(--color-border)]">
                        <button onClick={handleSignOut} className="w-full py-3 bg-[var(--color-ink)] text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity uppercase tracking-widest">Sign Out</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Link to="/login" className="hidden lg:block bg-[var(--color-ink)] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg transition-all">
                Sign In
              </Link>
            )}

            <button onClick={() => setMenuOpen(true)} className="lg:hidden p-2 text-[var(--color-ink)] hover:bg-[var(--color-cream)] rounded-lg transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Clean Mobile Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] bg-[var(--color-paper)] flex flex-col animate-fade-in">
          <div className="flex justify-between items-center p-6 border-b border-[var(--color-border)]">
            <span className="font-extrabold text-2xl text-[var(--color-ink)]">Math<span className="text-[var(--color-teal)]">Genius</span></span>
            <button onClick={() => setMenuOpen(false)} className="p-2 text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <nav className="flex flex-col p-6 gap-2">
            {visibleLinks.map((link) => (
              <Link key={link.path} to={link.path} onClick={() => setMenuOpen(false)}
                className={`text-2xl font-bold py-4 border-b border-[var(--color-border)] transition-colors ${active(link.path) ? 'text-[var(--color-teal)]' : 'text-[var(--color-ink)]'}`}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto p-6 border-t border-[var(--color-border)] flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[var(--color-muted)]">Aesthetic Mode</span>
              <ThemeToggle />
            </div>
            {user ? (
              <button onClick={handleSignOut} className="w-full text-center py-4 rounded-xl bg-red-50 text-red-600 text-sm font-bold uppercase tracking-widest border border-red-100">Sign Out</button>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)} className="w-full text-center bg-[var(--color-ink)] text-white py-4 rounded-xl text-sm font-bold uppercase tracking-widest">Sign In</Link>
            )}
          </div>
        </div>
      )}
    </>
  )
}
