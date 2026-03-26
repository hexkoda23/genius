import { Outlet } from 'react-router-dom'
import Header from './Header'
import FloatChat from '../FloatChat'

export default function Layout() {
  return (
    <div className="min-h-screen bg-[var(--color-paper)] selection:bg-[var(--color-gold)] selection:text-white relative overflow-x-hidden">
      <div className="grain" aria-hidden="true" />
      <Header />
      <main className="relative z-10">
        <Outlet />
      </main>
      <FloatChat />
    </div>
  )
}