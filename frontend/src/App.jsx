import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import OfflineBanner from './components/OfflineBanner'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import InstallBanner from './components/InstallBanner'

// ── Eagerly loaded (small, public, critical path) ──────────────────
import Home from './pages/Home'
import Solve from './pages/Solve'
import Landing from './pages/Landing'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Teach from './pages/Teach'
import Dashboard from './pages/Dashboard'
import MyAnalytics from './pages/MyAnalytics'
import MyBadges from './pages/MyBadges'
import MySettings from './pages/MySettings'
import MyReferrals from './pages/MyReferrals'
import IdentityVault from './pages/IdentityVault'

// ── Resilience Wrapper for Dynamic Imports ────────────────────────

// This catches "Failed to fetch dynamically imported module" errors 
// which often happen during HMR or if a Service Worker is stale.
const lazyWithRetry = (importFn) => {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.localStorage.getItem('page-has-been-force-refreshed') || 'false'
    )
    try {
      return await importFn()
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // First attempt failed, try ONE force refresh to clear stale SW/cache
        window.localStorage.setItem('page-has-been-force-refreshed', 'true')
        return window.location.reload()
      }
      // If it still fails after refresh, throw the error
      throw error
    }
  })
}

// ── Lazy loaded (large, protected pages) ──────────────────────────
const Bookmarks = lazyWithRetry(() => import('./pages/Bookmarks'))
const Practice = lazyWithRetry(() => import('./pages/Practice'))
const PastQuestions = lazyWithRetry(() => import('./pages/PastQuestions'))

const CBT = lazyWithRetry(() => import('./pages/CBT'))
const Leaderboard = lazyWithRetry(() => import('./pages/Leaderboard'))
const TopicMastery = lazyWithRetry(() => import('./pages/TopicMastery'))
const Notes = lazyWithRetry(() => import('./pages/Notes'))
const StudyPlanner = lazyWithRetry(() => import('./pages/StudyPlanner'))
const CBTHistory = lazyWithRetry(() => import('./pages/CBTHistory'))
const Profile = lazyWithRetry(() => import('./pages/Profile'))
const FormulaSheet = lazyWithRetry(() => import('./pages/FormulaSheet'))
const DailyChallenge = lazyWithRetry(() => import('./pages/DailyChallenge'))
const AIQuiz = lazyWithRetry(() => import('./pages/AIQuiz'))
const WeeklyReport = lazyWithRetry(() => import('./pages/WeeklyReport'))
const TopicWiki = lazyWithRetry(() => import('./pages/TopicWiki'))
const Certificate = lazyWithRetry(() => import('./pages/Certificate'))
const Review = lazyWithRetry(() => import('./pages/Review'))
const Challenge = lazyWithRetry(() => import('./pages/Challenge'))
const ShareProfile = lazyWithRetry(() => import('./pages/ShareProfile'))
const Groups = lazyWithRetry(() => import('./pages/Groups'))
const TheoryPractice = lazyWithRetry(() => import('./pages/TheoryPractice'))
const MockExam = lazyWithRetry(() => import('./pages/MockExam'))
const Classroom = lazyWithRetry(() => import('./pages/Classroom'))
const TeacherParentDashboard = lazyWithRetry(() => import('./pages/TeacherParentDashboard'))
const Battle = lazyWithRetry(() => import('./pages/Battle'))
const QuestionBank = lazyWithRetry(() => import('./pages/QuestionBank'))


// Minimal inline fallback — no full-screen spinner, just a fade-in skeleton bar
const PageFallback = () => (
  <div className="min-h-screen bg-[var(--color-paper)] flex flex-col gap-4 p-8 animate-pulse">
    <div className="h-8 w-48 bg-[var(--color-ink)]/10 rounded-2xl" />
    <div className="h-4 w-full max-w-lg bg-[var(--color-ink)]/5 rounded-xl" />
    <div className="h-4 w-3/4 max-w-sm bg-[var(--color-ink)]/5 rounded-xl" />
  </div>
)


function AppRoutes() {
  const { user } = useAuth()
  return (
    <>
      <InstallBanner />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public auth pages — no layout */}
          <Route path="/login" element={<Login defaultTab="login" />} />
          <Route path="/signup" element={<Login defaultTab="signup" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<Navigate to="/dashboard" replace />} />

          {/* Main app — with header layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/home" element={<Home />} />
            <Route path="/solve" element={<Solve />} />
            <Route path="/formulas" element={<FormulaSheet />} />
            <Route path="/teach" element={
              <ProtectedRoute><Teach /></ProtectedRoute>
            } />
            <Route path="/past-questions" element={
              <ProtectedRoute><PastQuestions /></ProtectedRoute>
            } />
            <Route path="/bookmarks" element={
              <ProtectedRoute><Bookmarks /></ProtectedRoute>
            } />
            <Route path="/practice" element={
              <ProtectedRoute><Practice /></ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/cbt" element={
              <ProtectedRoute><CBT /></ProtectedRoute>
            } />
            <Route path="/leaderboard" element={
              <ProtectedRoute><Leaderboard /></ProtectedRoute>
            } />
            <Route path="/mastery" element={
              <ProtectedRoute><TopicMastery /></ProtectedRoute>
            } />
            <Route path="/notes" element={
              <ProtectedRoute><Notes /></ProtectedRoute>
            } />
            <Route path="/planner" element={
              <ProtectedRoute><StudyPlanner /></ProtectedRoute>
            } />
            <Route path="/cbt-history" element={
              <ProtectedRoute><CBTHistory /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><Profile /></ProtectedRoute>
            } />
            <Route path="/profile/vault" element={
              <ProtectedRoute><IdentityVault /></ProtectedRoute>
            } />
            <Route path="/profile/analytics" element={
              <ProtectedRoute><MyAnalytics /></ProtectedRoute>
            } />
            <Route path="/profile/badges" element={
              <ProtectedRoute><MyBadges /></ProtectedRoute>
            } />
            <Route path="/profile/referrals" element={
              <ProtectedRoute><MyReferrals /></ProtectedRoute>
            } />
            <Route path="/profile/settings" element={
              <ProtectedRoute><MySettings /></ProtectedRoute>
            } />
            <Route path="/daily" element={
              <ProtectedRoute><DailyChallenge /></ProtectedRoute>
            } />

            <Route path="/ai-quiz" element={
              <ProtectedRoute><AIQuiz /></ProtectedRoute>
            } />
            <Route path="/weekly-report" element={
              <ProtectedRoute><WeeklyReport /></ProtectedRoute>
            } />
            <Route path="/wiki/:topic" element={
              <ProtectedRoute><TopicWiki /></ProtectedRoute>
            } />
            <Route path="/certificate" element={
              <ProtectedRoute><Certificate /></ProtectedRoute>
            } />
            <Route path="/review" element={
              <ProtectedRoute><Review /></ProtectedRoute>
            } />
            <Route path="/challenge" element={<ProtectedRoute><Challenge /></ProtectedRoute>} />
            <Route path="/challenge/:seed" element={<ProtectedRoute><Challenge /></ProtectedRoute>} />
            <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
            <Route path="/theory" element={
              <ProtectedRoute><TheoryPractice /></ProtectedRoute>
            } />

            {/* ── New routes ────────────────────────────────────────── */}
            <Route path="/mock-exam" element={
              <ProtectedRoute><MockExam /></ProtectedRoute>
            } />
            <Route path="/classroom" element={
              <ProtectedRoute><Classroom /></ProtectedRoute>
            } />
            <Route path="/monitor" element={
              <ProtectedRoute><TeacherParentDashboard /></ProtectedRoute>
            } />
            <Route path="/battle" element={
              <ProtectedRoute><Battle /></ProtectedRoute>
            } />
            <Route path="/question-bank" element={
              <ProtectedRoute><QuestionBank /></ProtectedRoute>
            } />
          </Route>

          {/* Public routes — no login needed */}
          <Route path="/share/:userId" element={<ShareProfile />} />

          {/* Catch-all — send logged-in users to dashboard, guests to landing */}
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default function App() {
  // ── Cleanup Resilience Flag ──────────────────────────────────────
  // If we reach this point, the app has loaded successfully. 
  // We clear the refresh flag so that we can try again if a 
  // dynamic import fails in a future session.
  useEffect(() => {
    const timer = setTimeout(() => {
      window.localStorage.removeItem('page-has-been-force-refreshed')
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <OfflineBanner />
            <AppRoutes />
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
