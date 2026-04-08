/** Build a usable href for preview links when the user typed a bare username. */
export function socialHref(platform: string, value: string): string {
  const v = value.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  const key = platform.trim().toLowerCase()
  const slug = v.replace(/^\/+/, '')

  const baseByPlatform: Record<string, string> = {
    github: 'https://github.com/',
    discord: 'https://discord.gg/',
    twitch: 'https://twitch.tv/',
    tiktok: 'https://tiktok.com/@',
    kick: 'https://kick.com/',
    youtube: 'https://youtube.com/@',
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    x: 'https://x.com/',
    threads: 'https://threads.net/@',
    linkedin: 'https://linkedin.com/in/',
    reddit: 'https://reddit.com/u/',
    telegram: 'https://t.me/',
    whatsapp: 'https://wa.me/',
    snapchat: 'https://snapchat.com/add/',
    pinterest: 'https://pinterest.com/',
    tumblr: 'https://tumblr.com/',
    weibo: 'https://weibo.com/',
    vk: 'https://vk.com/',
    bilibili: 'https://space.bilibili.com/',
    naver: 'https://blog.naver.com/',
    line: 'https://line.me/ti/p/~',
    wechat: 'https://weixin.qq.com/',
    steam: 'https://steamcommunity.com/id/',
    spotify: 'https://open.spotify.com/user/',
    soundcloud: 'https://soundcloud.com/',
    'apple music': 'https://music.apple.com/profile/',
    bandcamp: 'https://bandcamp.com/',
    patreon: 'https://patreon.com/',
    mastodon: 'https://mastodon.social/@',
    bluesky: 'https://bsky.app/profile/',
    behance: 'https://behance.net/',
    dribbble: 'https://dribbble.com/',
    deviantart: 'https://deviantart.com/',
    website: 'https://',
  }

  if (baseByPlatform[key]) return `${baseByPlatform[key]}${slug}`
  return `https://${slug}`
}
