export type MemberCardUser = {
  displayName: string
  avatarUrl: string | null
  bio?: string
}

export type MemberCardProfile = {
  bio?: string
  backgroundUrl?: string
  role?: string
}

type MemberCardContentProps = {
  user: MemberCardUser
  profile: MemberCardProfile
}

export function MemberCardContent({ user, profile }: MemberCardContentProps) {
  const avatarSrc =
    user.avatarUrl ?? 'https://cdn.discordapp.com/embed/avatars/0.png'
  const shownBio = profile.bio?.trim()
    ? profile.bio
    : user.bio?.trim()
      ? user.bio
      : 'No bio set.'

  return (
    <>
      <div className="west-member-card__top-line" />
      <div className="west-member-card__glow" />
      <div className="west-member-card__content">
        <div className="west-member-avatar-wrap">
          <div className="west-member-avatar-ring-glow" />
          <div className="west-member-avatar-shell">
            <img
              src={avatarSrc}
              alt={user.displayName}
              className="west-member-avatar"
              loading="lazy"
            />
          </div>
        </div>
        <div className="west-member-meta">
          <h3 className="west-member-name">{user.displayName.toUpperCase()}</h3>
          {profile.role?.trim() ? (
            <p className="west-member-role">{profile.role.trim()}</p>
          ) : null}
          <p className="west-member-bio">{shownBio}</p>
        </div>
      </div>
    </>
  )
}
