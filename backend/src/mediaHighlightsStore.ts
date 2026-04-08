import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export type MediaHighlightPlatform = 'youtube' | 'tiktok'

export type MediaHighlight = {
  id: string
  title: string
  player: string
  url: string
  platform: MediaHighlightPlatform
  thumb?: string
  description?: string
  createdAt: string
}

export type MediaHighlightsStore = {
  list(): Promise<MediaHighlight[]>
  add(item: Omit<MediaHighlight, 'id' | 'createdAt'>): Promise<MediaHighlight>
}

function isHighlight(value: unknown): value is MediaHighlight {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.player === 'string' &&
    typeof item.url === 'string' &&
    (item.platform === 'youtube' || item.platform === 'tiktok') &&
    typeof item.createdAt === 'string' &&
    (item.description === undefined || typeof item.description === 'string')
  )
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function createJsonMediaHighlightsStore(filePath: string): MediaHighlightsStore {
  const absolutePath = resolve(filePath)
  let items: MediaHighlight[] = []

  const load = () => {
    try {
      if (!existsSync(absolutePath)) {
        items = []
        return
      }
      const raw = readFileSync(absolutePath, 'utf8')
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        items = parsed.filter(isHighlight)
        return
      }
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown[] }).items)) {
        items = (parsed as { items: unknown[] }).items.filter(isHighlight)
        return
      }
      items = []
    } catch {
      items = []
    }
  }

  const save = () => {
    mkdirSync(dirname(absolutePath), { recursive: true })
    const tmp = `${absolutePath}.tmp`
    writeFileSync(tmp, `${JSON.stringify({ items }, null, 2)}\n`, 'utf8')
    renameSync(tmp, absolutePath)
  }

  load()

  return {
    async list() {
      return [...items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    },
    async add(input) {
      const next: MediaHighlight = {
        id: makeId(),
        title: input.title,
        player: input.player,
        url: input.url,
        platform: input.platform,
        thumb: input.thumb,
        description: input.description,
        createdAt: new Date().toISOString(),
      }
      items.unshift(next)
      save()
      return next
    },
  }
}
