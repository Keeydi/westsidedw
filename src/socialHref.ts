/** Build a usable href for preview links when the user typed a bare username. */
export function socialHref(platform: string, value: string): string {
  const v = value.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  if (platform === 'github') {
    const slug = v.replace(/^\/+/, '').replace(/^github\.com\/?/i, '')
    return `https://github.com/${slug}`
  }
  return v
}
