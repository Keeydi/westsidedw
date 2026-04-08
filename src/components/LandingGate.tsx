import { useMemo, type CSSProperties } from 'react'

type LandingGateProps = {
  onEnter: () => void
}

type LeafStyle = CSSProperties & {
  '--west-leaf-left': string
  '--west-leaf-top': string
  '--west-leaf-scale': number
  '--west-leaf-delay': string
  '--west-leaf-duration': string
}

export function LandingGate({ onEnter }: LandingGateProps) {
  const leaves = useMemo<LeafStyle[]>(() => {
    return Array.from({ length: 16 }, (_, index) => {
      const n = index + 1
      const drift = (Math.sin(n * 91.17) + 1) / 2
      const rise = (Math.cos(n * 63.41) + 1) / 2
      const scale = 0.72 + ((Math.sin(n * 19.27) + 1) / 2) * 1.08
      const delay = ((Math.cos(n * 37.19) + 1) / 2) * 9
      const duration = 8.5 + ((Math.sin(n * 29.77) + 1) / 2) * 7
      return {
        '--west-leaf-left': `${(drift * 100).toFixed(3)}vw`,
        '--west-leaf-top': `${(60 + rise * 50).toFixed(3)}vh`,
        '--west-leaf-scale': Number(scale.toFixed(4)),
        '--west-leaf-delay': `${delay.toFixed(3)}s`,
        '--west-leaf-duration': `${duration.toFixed(3)}s`,
      }
    })
  }, [])

  return (
    <button
      type="button"
      className="west-gate"
      onClick={onEnter}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onEnter()
        }
      }}
    >
      <span className="west-gate__ambient" aria-hidden="true">
        {leaves.map((style, index) => (
          <span key={index} className="west-gate__leaf" style={style} />
        ))}
        <span className="west-gate__orb west-gate__orb--one" />
        <span className="west-gate__orb west-gate__orb--two" />
        <span className="west-gate__orb west-gate__orb--three" />
        <span className="west-gate__orb west-gate__orb--four" />
      </span>
      <span className="west-gate__content west-gate__intro">
        <span className="west-gate__intro-box">
          <span className="west-gate__logo-wrap" aria-hidden="true">
            <img
              src="/affiliations/10k.png"
              alt=""
              className="west-gate__logo"
              loading="eager"
              decoding="async"
            />
          </span>
          <span className="west-gate__title">DYISKUMPADRES</span>
          <span className="west-gate__hint">Tap anywhere to enter</span>
        </span>
      </span>
    </button>
  )
}
