import type { CSSProperties } from 'react'

type BackgroundProfile = {
  backgroundUrl?: string
}

export function memberCardSurfaceStyle(
  profile: BackgroundProfile,
): CSSProperties | undefined {
  if (!profile.backgroundUrl?.trim()) return undefined
  return {
    backgroundImage: `linear-gradient(rgba(5, 8, 14, 0.72), rgba(5, 8, 14, 0.86)), url("${profile.backgroundUrl}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
}
