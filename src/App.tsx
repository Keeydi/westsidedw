import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { HeaderBar, type ThemeMode } from './components/HeaderBar'
import { Affiliations } from './components/Affiliations'
import { Hero } from './components/Hero'
import { Members } from './components/Members'
import { MemberProfile } from './components/MemberProfile'

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem('westside-theme') as ThemeMode | null
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const MEMBER_PUBLIC_PROFILE_PATH = /^\/members\/u\/[^/]+$/

function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)
  const location = useLocation()
  const hideHeader = MEMBER_PUBLIC_PROFILE_PATH.test(location.pathname)

  useEffect(() => {
    document.documentElement.setAttribute('data-west-theme', theme)
    document.documentElement.setAttribute('data-bs-theme', theme)
    window.localStorage.setItem('westside-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <div className={`west-app west-theme-${theme}`}>
      {!hideHeader ? <HeaderBar theme={theme} onToggleTheme={toggleTheme} /> : null}
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Hero />
              <Affiliations />
            </>
          }
        />
        <Route path="/members/me" element={<Members editable />} />
        <Route path="/members/u/:username" element={<MemberProfile />} />
        <Route path="/members" element={<Members editable={false} />} />
        <Route
          path="/media"
          element={
            <section className="west-archive-page d-flex flex-column align-items-center justify-content-center text-center px-3">
              <h1 className="west-archive-title mb-3">Media</h1>
              <p className="west-archive-subtext mb-0">Media page is under construction.</p>
            </section>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
