import { useCallback, useEffect, useId, useState } from 'react'
import { Collapse, Container } from 'react-bootstrap'
import { Link, NavLink } from 'react-router-dom'
import {
  buildSessionHeaders,
  consumeSidFromHashRoute,
  setSessionId,
} from '../authSession'
import { backendBaseUrl, discordAuthUrl } from '../config'

export type ThemeMode = 'dark' | 'light'

type HeaderBarProps = {
  theme: ThemeMode
  onToggleTheme: () => void
}

type AuthUser = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5h16M4 12h16M4 19h16" />
    </svg>
  )
}

export function HeaderBar({ theme, onToggleTheme }: HeaderBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const mobileNavId = useId()
  const backendBase = backendBaseUrl
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    consumeSidFromHashRoute()
    const controller = new AbortController()
    const loadMe = async () => {
      try {
        const response = await fetch(`${backendBase}/auth/me`, {
          credentials: 'include',
          headers: buildSessionHeaders(),
          signal: controller.signal,
        })
        if (!response.ok) {
          if (response.status === 401) setSessionId(null)
          setAuthUser(null)
          return
        }
        const payload = (await response.json()) as {
          authenticated: boolean
          user?: AuthUser
        }
        if (payload.authenticated && payload.user) {
          setAuthUser(payload.user)
          return
        }
        setAuthUser(null)
      } catch {
        if (!controller.signal.aborted) setAuthUser(null)
      }
    }
    void loadMe()
    return () => controller.abort()
  }, [backendBase])

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'west-pill-nav-link',
      'px-4 py-2 text-sm fw-medium rounded-3 text-decoration-none',
      isActive ? 'west-pill-nav-link--active' : '',
    ]
      .filter(Boolean)
      .join(' ')

  return (
    <header className="west-header" data-bs-theme={theme}>
      <Container fluid className="west-header-page-gutter px-3 px-sm-4 pt-3">
        <div className="west-header-pill">
          <div className="d-flex align-items-center justify-content-between px-3 px-sm-4 west-header-inner-row">
            <Link
              className="west-pill-logo font-navex text-uppercase text-decoration-none"
              aria-label="westside Home"
              to="/"
              onClick={closeMenu}
            >
              westside
            </Link>

            <div className="d-none d-md-flex align-items-center gap-1">
              <NavLink className={navLinkClass} to="/">
                Home
              </NavLink>
              <NavLink className={navLinkClass} to="/media">
                Media
              </NavLink>
              <NavLink className={navLinkClass} to="/members">
                Members
              </NavLink>
              <div className="west-header-divider mx-2" aria-hidden="true" />
              {authUser ? (
                <Link
                  to="/members/me"
                  className="west-header-avatar-link text-decoration-none"
                  title={authUser.displayName}
                >
                  <img
                    src={
                      authUser.avatarUrl ??
                      'https://cdn.discordapp.com/embed/avatars/0.png'
                    }
                    alt={authUser.displayName}
                    className="west-header-avatar-img"
                  />
                </Link>
              ) : (
                <a
                  href={discordAuthUrl}
                  className="west-pill-login-btn text-decoration-none"
                >
                  <DiscordIcon />
                  <span>Login</span>
                </a>
              )}
              <div className="west-header-divider mx-2" aria-hidden="true" />
              <button
                type="button"
                className="west-pill-icon-btn"
                onClick={onToggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <SunIcon className="west-pill-icon-btn__svg" /> : <MoonIcon className="west-pill-icon-btn__svg" />}
              </button>
            </div>

            <div className="d-flex d-md-none align-items-center gap-2">
              <button
                type="button"
                className="west-pill-icon-btn"
                onClick={onToggleTheme}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <SunIcon className="west-pill-icon-btn__svg" /> : <MoonIcon className="west-pill-icon-btn__svg" />}
              </button>
              <button
                type="button"
                className="west-pill-icon-btn"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Open menu"
                aria-expanded={menuOpen}
                aria-controls={mobileNavId}
              >
                <MenuIcon />
              </button>
            </div>
          </div>

          <Collapse in={menuOpen}>
            <div id={mobileNavId} className="d-md-none">
              <div className="west-header-mobile-panel border-top west-header-mobile-panel-border px-3 py-3 d-flex flex-column gap-1">
                <NavLink className={navLinkClass} to="/" onClick={closeMenu}>
                  Home
                </NavLink>
                <NavLink className={navLinkClass} to="/media" onClick={closeMenu}>
                  Media
                </NavLink>
                <NavLink className={navLinkClass} to="/members" onClick={closeMenu}>
                  Members
                </NavLink>
                {authUser ? (
                  <Link
                    to="/members/me"
                    onClick={closeMenu}
                    className="west-header-avatar-link west-header-avatar-link--mobile mt-2 text-decoration-none"
                    title={authUser.displayName}
                  >
                    <img
                      src={
                        authUser.avatarUrl ??
                        'https://cdn.discordapp.com/embed/avatars/0.png'
                      }
                      alt={authUser.displayName}
                      className="west-header-avatar-img"
                    />
                    <span className="west-header-avatar-name">{authUser.displayName}</span>
                  </Link>
                ) : (
                  <a
                    href={discordAuthUrl}
                    className="west-pill-login-btn west-pill-login-btn--block mt-2 justify-content-center text-decoration-none"
                  >
                    <DiscordIcon />
                    <span>Login</span>
                  </a>
                )}
              </div>
            </div>
          </Collapse>
        </div>
      </Container>
    </header>
  )
}
