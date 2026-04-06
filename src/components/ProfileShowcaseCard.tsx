import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { socialHref } from '../socialHref'

type SocialLinks = {
  twitch?: string
  tiktok?: string
  discord?: string
  kick?: string
  youtube?: string
  github?: string
}

type ProfileShowcaseCardProps = {
  displayName: string
  avatarUrl: string | null
  bio: string
  socialLinks?: SocialLinks
}

function IconKick({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      stroke="currentColor"
      fill="currentColor"
      strokeWidth={0}
      viewBox="0 0 24 24"
      height="1em"
      width="1em"
      aria-hidden
    >
      <path d="M1.333 0h8v5.333H12V2.667h2.667V0h8v8H20v2.667h-2.667v2.666H20V16h2.667v8h-8v-2.667H12v-2.666H9.333V24h-8Z" />
    </svg>
  )
}

function IconYoutube({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      stroke="currentColor"
      fill="currentColor"
      strokeWidth={0}
      viewBox="0 0 24 24"
      height="1em"
      width="1em"
      aria-hidden
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function IconTwitch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.571 4.714h1.715v5.143H11.57V4.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0H6zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714v9.429z" />
    </svg>
  )
}

function IconGithub({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

function IconTiktok({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  )
}

function IconDiscord({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

const ICONS: Record<string, (p: { className?: string }) => ReactNode> = {
  kick: (p) => <IconKick {...p} />,
  youtube: (p) => <IconYoutube {...p} />,
  twitch: (p) => <IconTwitch {...p} />,
  github: (p) => <IconGithub {...p} />,
  tiktok: (p) => <IconTiktok {...p} />,
  discord: (p) => <IconDiscord {...p} />,
}

function SocialIcon({ platform }: { platform: string }) {
  const Icon = ICONS[platform.toLowerCase()]
  if (Icon) {
    return <Icon className="west-profile-showcase-social-svg" />
  }
  return (
    <span className="west-profile-showcase-social-fallback">
      {platform.slice(0, 2).toUpperCase()}
    </span>
  )
}

function typingDelayMs(length: number): number {
  if (length > 320) return 14
  if (length > 160) return 22
  return 34
}

export function ProfileShowcaseCard({
  displayName,
  avatarUrl,
  bio,
  socialLinks,
}: ProfileShowcaseCardProps) {
  const avatarSrc =
    avatarUrl ?? 'https://cdn.discordapp.com/embed/avatars/0.png'
  const title = displayName.toUpperCase()
  const [typedLength, setTypedLength] = useState(0)
  const [cursorBlinking, setCursorBlinking] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      setTypedLength(0)
      setCursorBlinking(false)
    })
    if (!bio) return

    let cancelled = false
    const delay = typingDelayMs(bio.length)
    const pauseFullMs = 900
    const pauseEmptyMs = 450

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms)
      })

    const run = async () => {
      while (!cancelled && bio) {
        setCursorBlinking(false)
        for (let i = 0; i <= bio.length; i++) {
          if (cancelled) return
          setTypedLength(i)
          await sleep(delay)
        }
        if (cancelled) return
        setCursorBlinking(true)
        await sleep(pauseFullMs)
        if (cancelled) return
        setCursorBlinking(false)
        for (let i = bio.length - 1; i >= 0; i--) {
          if (cancelled) return
          setTypedLength(i)
          await sleep(delay)
        }
        if (cancelled) return
        setCursorBlinking(true)
        await sleep(pauseEmptyMs)
        if (cancelled) return
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [bio])

  const visibleBio = bio.slice(0, typedLength)
  const cursorClass = cursorBlinking
    ? 'west-profile-showcase-cursor animate-blink-cursor'
    : 'west-profile-showcase-cursor west-profile-showcase-cursor--typing'

  const entries = socialLinks
    ? Object.entries(socialLinks).filter(([, url]) => Boolean(url?.trim()))
    : []

  return (
    <div className="west-profile-showcase-card">
      <div className="west-profile-showcase-inner">
        <div className="west-profile-showcase-avatar-wrap">
          <div className="west-profile-showcase-avatar-ring">
            <img
              src={avatarSrc}
              alt={displayName}
              className="west-profile-showcase-avatar-img"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>

        <div className="west-profile-showcase-text">
          <h1 className="west-profile-showcase-title">{title}</h1>
          <p
            className="west-profile-showcase-bio"
            style={{ fontWeight: 500, fontStyle: 'italic' }}
            aria-label={bio}
          >
            <span className="west-profile-showcase-bio-line">
              {visibleBio}
              <span className={cursorClass} aria-hidden>
                |
              </span>
            </span>
          </p>
        </div>

        {entries.length > 0 ? (
          <div className="west-profile-showcase-socials">
            {entries.map(([key, raw]) => (
              <a
                key={key}
                href={socialHref(key, raw)}
                target="_blank"
                rel="noopener noreferrer"
                className="west-profile-showcase-social-link"
                aria-label={key}
              >
                <SocialIcon platform={key} />
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
