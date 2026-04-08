import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const TYPE_LINES = [
  'Private member hub with curated media and profiles.',
  'Built for crew identity, updates, and trusted access.',
  'Simple interface. Focused content. Fast navigation.',
]

function fromBase(path: string): string {
  const cleaned = path.replace(/^\/+/, '')
  return `${import.meta.env.BASE_URL}${cleaned}`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function Hero() {
  const navigate = useNavigate()
  const [clock, setClock] = useState(() => new Date())
  const [lineIndex, setLineIndex] = useState(0)
  const [lineVisible, setLineVisible] = useState(true)

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const fadeOut = window.setTimeout(() => setLineVisible(false), 3200)
    const swap = window.setTimeout(() => {
      setLineIndex((i) => (i + 1) % TYPE_LINES.length)
      setLineVisible(true)
    }, 3600)
    return () => {
      window.clearTimeout(fadeOut)
      window.clearTimeout(swap)
    }
  }, [lineIndex])

  return (
    <section id="home" className="west-home-hero px-3 px-md-4">
      <div className="west-home-shell">
        <div className="west-home-left">
          <div className="west-home-tag">PRIVATE PORTAL</div>
          <img
            src={fromBase('/affiliations/10k.png')}
            alt="10k logo"
            className="west-home-logo"
            loading="eager"
            decoding="async"
          />
          <h1 className="west-home-title">DYISKUMPADRES</h1>
          <p className={`west-home-typed ${lineVisible ? 'west-home-typed--show' : ''}`}>
            <span>{TYPE_LINES[lineIndex]}</span>
          </p>
          <div className="west-home-actions">
            <button type="button" className="west-home-btn west-home-btn--primary" onClick={() => navigate('/members')}>
              View Members
            </button>
            <button type="button" className="west-home-btn west-home-btn--secondary" onClick={() => navigate('/media')}>
              Open Media
            </button>
          </div>
        </div>

        <aside className="west-home-right">
          <div className="west-home-clock">
            <div className="west-home-clock-time">{formatTime(clock)}</div>
            <div className="west-home-clock-date">{formatDate(clock)}</div>
            <div className="west-home-clock-divider" />
            <div className="west-home-clock-note">Secure members dashboard online</div>
          </div>
        </aside>
      </div>
    </section>
  )
}
