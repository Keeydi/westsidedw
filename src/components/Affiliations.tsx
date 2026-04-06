import { useCallback, type MouseEvent } from 'react'
import { Col, Container, Row } from 'react-bootstrap'

function fromBase(path: string): string {
  const cleaned = path.replace(/^\/+/, '')
  return `${import.meta.env.BASE_URL}${cleaned}`
}

const ITEMS = [
  {
    image: fromBase('/affiliations/10k.png'),
    alt: '10k',
    text: 'Core partner on builds, drops, and long-running collabs.',
  },
  {
    image: fromBase('/affiliations/10kxWS.png'),
    alt: '10k x westside',
    text: 'Including all revshit-affiliated organizations.',
  },
  {
    image: fromBase('/affiliations/1011k.png'),
    alt: '1011k',
    text: 'Solid "Francis Leo Marcos" supporters.',
  },
] as const

function BracketStart() {
  return (
    <span className="west-aff-bracket" aria-hidden>
      <span className="west-aff-bracket__cell west-aff-bracket__cell--lt" />
      <span className="west-aff-bracket__cell west-aff-bracket__cell--lm" />
      <span className="west-aff-bracket__cell west-aff-bracket__cell--lb" />
    </span>
  )
}

function BracketEnd() {
  return (
    <span className="west-aff-bracket" aria-hidden>
      <span className="west-aff-bracket__cell west-aff-bracket__cell--rt" />
      <span className="west-aff-bracket__cell west-aff-bracket__cell--rm" />
      <span className="west-aff-bracket__cell west-aff-bracket__cell--rb" />
    </span>
  )
}

function CornerPlus({ className }: { className: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
  )
}

function CompassGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 4.1 12 6" />
      <path d="m5.1 8-2.9-.8" />
      <path d="m6 12-1.9 2" />
      <path d="M7.2 2.2 8 5.1" />
      <path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z" />
    </svg>
  )
}

type AffiliationCardProps = {
  image: string
  imageAlt: string
  text: string
}

function AffiliationCard({ image, imageAlt, text }: AffiliationCardProps) {
  const handlePointerMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const card = event.currentTarget
      const rect = card.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const px = x / rect.width - 0.5
      const py = y / rect.height - 0.5

      card.style.setProperty('--mx', `${x}px`)
      card.style.setProperty('--my', `${y}px`)
      card.style.setProperty('--rx', `${(-py * 8).toFixed(2)}deg`)
      card.style.setProperty('--ry', `${(px * 10).toFixed(2)}deg`)
    },
    [],
  )

  const resetPointer = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const card = event.currentTarget
    card.style.setProperty('--rx', '0deg')
    card.style.setProperty('--ry', '0deg')
    card.style.setProperty('--mx', '50%')
    card.style.setProperty('--my', '50%')
  }, [])

  return (
    <Col xs={12} sm={6} lg={4}>
      <div
        className="west-aff-card"
        tabIndex={0}
        onMouseMove={handlePointerMove}
        onMouseLeave={resetPointer}
      >
        <CornerPlus className="west-aff-card__corner west-aff-card__corner--tl" />
        <CornerPlus className="west-aff-card__corner west-aff-card__corner--bl" />
        <CornerPlus className="west-aff-card__corner west-aff-card__corner--tr" />
        <CornerPlus className="west-aff-card__corner west-aff-card__corner--br" />
        <div className="west-aff-card__inner">
          <div className="west-aff-card__front">
            <CompassGlyph className="west-aff-card__glyph" />
          </div>
          <div className="west-aff-card__back">
            <div className="west-aff-card__img-wrap">
              <img
                src={image}
                alt={imageAlt}
                className="west-aff-card__img"
                loading="lazy"
                decoding="async"
              />
            </div>
            <p className="west-aff-card__caption">{text}</p>
          </div>
        </div>
      </div>
    </Col>
  )
}

export function Affiliations() {
  return (
    <section className="west-aff position-relative overflow-hidden" aria-labelledby="affiliations-heading">
      <Container fluid className="px-3 px-sm-4 px-lg-4" style={{ maxWidth: 1280 }}>
        <div className="text-center mb-5 mb-md-5 pb-2">
          <h2 id="affiliations-heading" className="west-aff-heading d-flex align-items-center justify-content-center gap-0 mb-0">
            <BracketStart />
            <span className="west-aff-heading__text fw-light">affiliations</span>
            <BracketEnd />
          </h2>
        </div>
        <Row className="g-4 west-aff-grid mx-auto justify-content-center">
          {ITEMS.map((item) => (
            <AffiliationCard key={item.alt} image={item.image} imageAlt={item.alt} text={item.text} />
          ))}
        </Row>
      </Container>
    </section>
  )
}
