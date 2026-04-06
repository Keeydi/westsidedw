export function Hero() {
  return (
    <section
      id="home"
      className="west-hero d-flex flex-column justify-content-center align-items-center text-center px-3"
    >
      <p className="west-hero-code-accent font-monospace fst-italic mb-0" aria-hidden="true">
        while (true) fork();
      </p>
      <h1 className="west-title display-1 text-uppercase mb-4 mb-md-5">WESTSIDE</h1>
      <p className="west-subtext font-monospace small mx-auto mb-0">
        Our organization creates random things then tears them down with cold-blooded precision,
        cataloguing every failure. We hunt vulnerabilities across the internet and enumerate weak
        points without remorse.
      </p>
    </section>
  )
}
