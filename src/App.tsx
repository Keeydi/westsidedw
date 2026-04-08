import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { HeaderBar } from './components/HeaderBar'
import { Hero } from './components/Hero'
import { HomeMusicPlayer } from './components/HomeMusicPlayer'
import { LandingGate } from './components/LandingGate'
import { MediaArchivePage } from './components/MediaArchivePage'
import { Members } from './components/Members'
import { MemberProfile } from './components/MemberProfile'

type ThemeMode = 'dark' | 'light'

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem('westside-theme') as ThemeMode | null
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const MEMBER_PUBLIC_PROFILE_PATH = /^\/members\/u\/[^/]+$/

function App() {
  const [theme] = useState<ThemeMode>(getInitialTheme)
  const [hasEntered, setHasEntered] = useState<boolean>(false)
  const location = useLocation()
  const hideHeader = MEMBER_PUBLIC_PROFILE_PATH.test(location.pathname)

  useEffect(() => {
    document.documentElement.setAttribute('data-west-theme', theme)
    document.documentElement.setAttribute('data-bs-theme', theme)
    window.localStorage.setItem('westside-theme', theme)
  }, [theme])

  useEffect(() => {
    const handleBackNavigation = () => {
      setHasEntered(false)
    }
    window.addEventListener('popstate', handleBackNavigation)
    return () => {
      window.removeEventListener('popstate', handleBackNavigation)
    }
  }, [])

  const enterSite = useCallback(() => {
    setHasEntered(true)
  }, [])

  if (!hasEntered) {
    return <LandingGate onEnter={enterSite} />
  }

  return (
    <div className={`west-app west-theme-${theme}`}>
      {!hideHeader ? <HeaderBar /> : null}
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Hero />
              <HomeMusicPlayer />
            </>
          }
        />
        <Route path="/members/me" element={<Members editable />} />
        <Route path="/members/u/:username" element={<MemberProfile />} />
        <Route path="/members" element={<Members editable={false} />} />
        <Route
          path="/media"
          element={
            <>
              <MediaArchivePage />
              <HomeMusicPlayer />
            </>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
