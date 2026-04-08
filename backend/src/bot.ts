import {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  Partials,
  type ButtonInteraction,
  type Message,
} from 'discord.js'
import type { ProfileDatabase } from './profileDatabase.js'
import type { MediaHighlightsStore } from './mediaHighlightsStore.js'

export type BotStatus = 'disabled' | 'connecting' | 'ready' | 'error'

export type ApprovalDecision = 'approved' | 'declined' | 'timeout' | 'unavailable'
export type ApprovalRole = 'Leader' | 'Co-Leader' | 'Officer' | 'Veteran' | 'Recruit'

export type ApprovalResult = {
  decision: ApprovalDecision
  assignedRole?: ApprovalRole
}

type ApprovalUser = {
  id: string
  username: string
  displayName: string
  avatarUrl?: string | null
  email?: string
  bio?: string
  requestedRole?: string
}

type ApprovalRequest = {
  approverDiscordId: string
  user: ApprovalUser
  timeoutMs: number
}

type PendingApproval = {
  resolve: (result: ApprovalResult) => void
  timeout: NodeJS.Timeout
  approverDiscordId: string
}

export type BotHandle = {
  getStatus: () => BotStatus
  getError: () => string | null
  getPresenceStatus: (userId: string) => Promise<'online' | 'idle' | 'dnd' | 'offline'>
  requestMembershipApproval: (request: ApprovalRequest) => Promise<ApprovalResult>
}

type BotDependencies = {
  profileDb: ProfileDatabase
  mediaHighlightsStore: MediaHighlightsStore
}

type UrlMetadata = {
  title?: string
  author?: string
  description?: string
  thumbnail?: string
}

const ROLE_PREFIX = 'west_role:'
const DECLINE_PREFIX = 'west_decline:'
const DEFAULT_ROLE_LABEL = 'Pending role assignment'
const ROLE_CHOICES: ReadonlyArray<{ key: string; value: ApprovalRole; label: string }> = [
  { key: 'leader', value: 'Leader', label: 'Leader' },
  { key: 'co_leader', value: 'Co-Leader', label: 'Co-Leader' },
  { key: 'officer', value: 'Officer', label: 'Officer' },
  { key: 'veteran', value: 'Veteran', label: 'Veteran' },
  { key: 'recruit', value: 'Recruit', label: 'Recruit' },
]

function createRequestId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function roleFromKey(key: string): ApprovalRole | null {
  const match = ROLE_CHOICES.find((choice) => choice.key === key)
  return match?.value ?? null
}

function buildDecisionButtons(requestId: string): ActionRowBuilder<ButtonBuilder>[] {
  const roleRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...ROLE_CHOICES.map((choice) =>
      new ButtonBuilder()
        .setCustomId(`${ROLE_PREFIX}${requestId}:${choice.key}`)
        .setLabel(choice.label)
        .setStyle(ButtonStyle.Primary),
    ),
  )

  const controlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${DECLINE_PREFIX}${requestId}`)
      .setLabel('Decline')
      .setStyle(ButtonStyle.Danger),
  )

  return [roleRow, controlRow]
}

function compactText(value: string | undefined, maxLength: number): string | null {
  if (!value) return null
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return null
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}

function getYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    if (host === 'youtu.be') {
      const id = parsed.pathname.replace(/^\/+/, '')
      return id || null
    }
    if (host.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/watch')) return parsed.searchParams.get('v')
      if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/')[2] ?? null
      if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/')[2] ?? null
    }
    return null
  } catch {
    return null
  }
}

function getTikTokVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.toLowerCase().includes('tiktok.com')) return null
    const match = parsed.pathname.match(/\/video\/(\d+)/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

async function resolveTikTokThumbnail(url: string): Promise<string | undefined> {
  try {
    const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    const response = await fetch(endpoint)
    if (!response.ok) return undefined
    const payload = (await response.json()) as { thumbnail_url?: string }
    const thumb = payload.thumbnail_url?.trim()
    return thumb && thumb.length > 0 ? thumb : undefined
  } catch {
    return undefined
  }
}

async function resolveYouTubeMetadata(url: string): Promise<UrlMetadata> {
  try {
    const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const response = await fetch(endpoint)
    if (!response.ok) return {}
    const payload = (await response.json()) as {
      title?: string
      author_name?: string
      thumbnail_url?: string
    }
    return {
      title: payload.title?.trim() || undefined,
      author: payload.author_name?.trim() || undefined,
      thumbnail: payload.thumbnail_url?.trim() || undefined,
    }
  } catch {
    return {}
  }
}

async function resolveTikTokMetadata(url: string): Promise<UrlMetadata> {
  try {
    const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    const response = await fetch(endpoint)
    if (!response.ok) return {}
    const payload = (await response.json()) as {
      title?: string
      author_name?: string
      thumbnail_url?: string
    }
    return {
      title: payload.title?.trim() || undefined,
      author: payload.author_name?.trim() || undefined,
      thumbnail: payload.thumbnail_url?.trim() || undefined,
      description: payload.title?.trim() || undefined,
    }
  } catch {
    return {}
  }
}

async function replySafe(message: Message, content: string): Promise<void> {
  try {
    await message.reply({ content })
  } catch (error) {
    console.error('Failed to send command reply:', error)
  }
}

function buildRequestEmbed(user: ApprovalUser): EmbedBuilder {
  const roleLabel = compactText(user.requestedRole, 80) ?? DEFAULT_ROLE_LABEL
  const email = compactText(user.email, 120) ?? 'Not shared'
  const bio = compactText(user.bio, 500) ?? 'No Discord bio available.'

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('New Membership Approval Request')
    .setDescription('A user requested access to the Westside members area.')
    .addFields(
      {
        name: 'Discord Name',
        value: `${user.displayName} (@${user.username})`,
        inline: false,
      },
      {
        name: 'Discord ID',
        value: user.id,
        inline: true,
      },
      {
        name: 'Requested Role',
        value: roleLabel,
        inline: true,
      },
      {
        name: 'Email',
        value: email,
        inline: false,
      },
      {
        name: 'Bio',
        value: bio,
        inline: false,
      },
    )
    .setFooter({ text: 'Use the buttons below to accept or decline.' })
    .setTimestamp(new Date())

  if (user.avatarUrl) {
    embed.setThumbnail(user.avatarUrl)
  }

  return embed
}

async function finalizeInteractionMessage(
  interaction: ButtonInteraction,
  decision: Exclude<ApprovalDecision, 'timeout' | 'unavailable'>,
  assignedRole?: ApprovalRole,
): Promise<void> {
  const label = decision === 'approved' ? 'ACCEPTED' : 'DECLINED'
  const roleRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...ROLE_CHOICES.map((choice) =>
      new ButtonBuilder()
        .setCustomId(`west_done_role_${choice.key}`)
        .setLabel(choice.label)
        .setStyle(
          decision === 'approved' && assignedRole === choice.value
            ? ButtonStyle.Success
            : ButtonStyle.Secondary,
        )
        .setDisabled(true),
    ),
  )
  const controlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('west_done_decline')
      .setLabel('Decline')
      .setStyle(decision === 'declined' ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('west_done_status')
      .setLabel(`Request ${label}`)
      .setStyle(decision === 'approved' ? ButtonStyle.Success : ButtonStyle.Danger)
      .setDisabled(true),
  )

  const existingEmbed = interaction.message.embeds[0]
  const finalEmbed = existingEmbed ? EmbedBuilder.from(existingEmbed) : new EmbedBuilder()
  const decisionText =
    decision === 'approved' && assignedRole
      ? `${label} by <@${interaction.user.id}> as **${assignedRole}**`
      : `${label} by <@${interaction.user.id}>`
  finalEmbed
    .setColor(decision === 'approved' ? 0x57f287 : 0xed4245)
    .addFields({
      name: 'Decision',
      value: decisionText,
      inline: false,
    })
    .setTimestamp(new Date())

  await interaction.update({
    embeds: [finalEmbed],
    components: [roleRow, controlRow],
  })
}

export function startDiscordBot(
  token: string | undefined,
  enabled = true,
  guildId?: string,
  dependencies?: BotDependencies,
): BotHandle {
  let status: BotStatus = 'disabled'
  let errorMessage: string | null = null
  const pending = new Map<string, PendingApproval>()

  if (!enabled || !token || !dependencies) {
    return {
      getStatus: () => status,
      getError: () => errorMessage,
      getPresenceStatus: async () => 'offline',
      requestMembershipApproval: async () => ({ decision: 'unavailable' }),
    }
  }

  status = 'connecting'
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  })

  client.once(Events.ClientReady, () => {
    status = 'ready'
    console.log(`Discord bot ready as ${client.user?.tag ?? 'unknown'}`)
    void client.application?.commands
      .create({
        name: 'yth',
        description: 'Submit a YouTube highlight to Media page',
        options: [
          {
            name: 'url',
            description: 'YouTube link to publish',
            type: ApplicationCommandOptionType.String,
            required: true,
          },
          {
            name: 'title',
            description: 'Custom title to display in Media (optional)',
            type: ApplicationCommandOptionType.String,
            required: false,
          },
        ],
      })
      .catch((error: unknown) => {
        console.error('Failed to register /yth command:', error)
      })
    void client.application?.commands
      .create({
        name: 'tkh',
        description: 'Submit a TikTok highlight to Media page',
        options: [
          {
            name: 'url',
            description: 'TikTok link to publish',
            type: ApplicationCommandOptionType.String,
            required: true,
          },
          {
            name: 'title',
            description: 'Custom title to display in Media (optional)',
            type: ApplicationCommandOptionType.String,
            required: false,
          },
        ],
      })
      .catch((error: unknown) => {
        console.error('Failed to register /tkh command:', error)
      })
  })

  client.on(Events.Error, (error) => {
    status = 'error'
    errorMessage = error.message
    console.error('Discord bot error:', error)
  })

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return
    const trimmed = message.content.trim()
    const parts = trimmed.split(/\s+/)
    const command = (parts[0] ?? '').toLowerCase()
    const isYouTube = command === '/yth'
    const isTikTok = command === '/tkh'
    if (!isYouTube && !isTikTok) return

    const rawUrl = parts.slice(1).join(' ').trim()
    if (!rawUrl) {
      await replySafe(
        message,
        isYouTube
          ? 'Usage: `/yth https://www.youtube.com/watch?v=VIDEO_ID`'
          : 'Usage: `/tkh https://www.tiktok.com/@user/video/VIDEO_ID`',
      )
      return
    }

    const videoId = isYouTube ? getYouTubeVideoId(rawUrl) : getTikTokVideoId(rawUrl)
    if (!videoId) {
      await replySafe(
        message,
        isYouTube
          ? 'Invalid YouTube URL. Please send a valid watch/shorts/share link.'
          : 'Invalid TikTok URL. Please send a valid TikTok video link.',
      )
      return
    }

    const isMember = await dependencies.profileDb.isGroupMemberById(message.author.id)
    if (!isMember) {
      await replySafe(message, 'Only approved group members can submit highlights.')
      return
    }

    const canonicalUrl = isYouTube
      ? `https://www.youtube.com/watch?v=${videoId}`
      : rawUrl
    const submitterName = message.member?.displayName ?? message.author.globalName ?? message.author.username
    const metadata = isYouTube
      ? await resolveYouTubeMetadata(canonicalUrl)
      : await resolveTikTokMetadata(canonicalUrl)
    const title = metadata.title || (isYouTube
      ? `YouTube Highlight ${videoId.slice(0, 6)}`
      : `TikTok Highlight ${videoId.slice(-6)}`)
    const playerName = metadata.author || submitterName
    const thumb = metadata.thumbnail || (isYouTube
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : await resolveTikTokThumbnail(canonicalUrl))

    await dependencies.mediaHighlightsStore.add({
      title,
      player: playerName,
      url: canonicalUrl,
      platform: isYouTube ? 'youtube' : 'tiktok',
      thumb,
      description: metadata.description,
    })

    await replySafe(
      message,
      `${isYouTube ? 'YouTube' : 'TikTok'} highlight added for **${playerName}**. It is now available on the Media page preview.`,
    )
  })

  client.on(Events.InteractionCreate, async (interaction) => {
    if (
      interaction.isChatInputCommand() &&
      (interaction.commandName === 'yth' || interaction.commandName === 'tkh')
    ) {
      const isYouTube = interaction.commandName === 'yth'
      const rawUrl = interaction.options.getString('url', true).trim()
      const customTitle = interaction.options.getString('title')?.trim()
      const videoId = isYouTube ? getYouTubeVideoId(rawUrl) : getTikTokVideoId(rawUrl)
      if (!videoId) {
        await interaction.reply({
          content: isYouTube
            ? 'Invalid YouTube URL. Please send a valid watch/shorts/share link.'
            : 'Invalid TikTok URL. Please send a valid TikTok video link.',
          ephemeral: true,
        })
        return
      }

      const isMember = await dependencies.profileDb.isGroupMemberById(interaction.user.id)
      if (!isMember) {
        await interaction.reply({
          content: 'Only approved group members can submit highlights.',
          ephemeral: true,
        })
        return
      }

      const canonicalUrl = isYouTube
        ? `https://www.youtube.com/watch?v=${videoId}`
        : rawUrl
      const submitterName =
        interaction.member && 'displayName' in interaction.member
          ? String(interaction.member.displayName)
          : interaction.user.globalName ?? interaction.user.username
      const metadata = isYouTube
        ? await resolveYouTubeMetadata(canonicalUrl)
        : await resolveTikTokMetadata(canonicalUrl)
      const title = customTitle || metadata.title || (isYouTube
        ? `YouTube Highlight ${videoId.slice(0, 6)}`
        : `TikTok Highlight ${videoId.slice(-6)}`)
      const playerName = metadata.author || submitterName
      const thumb = metadata.thumbnail || (isYouTube
        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        : await resolveTikTokThumbnail(canonicalUrl))

      await dependencies.mediaHighlightsStore.add({
        title,
        player: playerName,
        url: canonicalUrl,
        platform: isYouTube ? 'youtube' : 'tiktok',
        thumb,
        description: metadata.description,
      })

      await interaction.reply({
        content: `${isYouTube ? 'YouTube' : 'TikTok'} highlight added for **${playerName}**. It is now available on the Media page preview.`,
        ephemeral: true,
      })
      return
    }

    if (!interaction.isButton()) return

    const customId = interaction.customId
    const isApprove = customId.startsWith(ROLE_PREFIX)
    const isDecline = customId.startsWith(DECLINE_PREFIX)
    if (!isApprove && !isDecline) return

    const parts = customId.split(':')
    const requestId = parts[1]
    const roleKey = parts[2]
    if (!requestId) return

    const request = pending.get(requestId)
    if (!request) {
      await interaction.reply({
        content: 'This request is already handled or expired.',
        ephemeral: true,
      })
      return
    }

    if (interaction.user.id !== request.approverDiscordId) {
      await interaction.reply({
        content: 'Only the configured approver can use this button.',
        ephemeral: true,
      })
      return
    }

    pending.delete(requestId)
    clearTimeout(request.timeout)

    const assignedRole = isApprove && roleKey ? roleFromKey(roleKey) : null
    if (isApprove && !assignedRole) {
      await interaction.reply({
        content: 'Invalid role selection.',
        ephemeral: true,
      })
      return
    }
    const decision: Exclude<ApprovalDecision, 'timeout' | 'unavailable'> = isApprove ? 'approved' : 'declined'

    try {
      await finalizeInteractionMessage(interaction, decision, assignedRole ?? undefined)
    } catch (messageError) {
      console.error('Failed to update approval message:', messageError)
    }

    request.resolve({
      decision,
      assignedRole: decision === 'approved' ? (assignedRole ?? undefined) : undefined,
    })
  })

  void client.login(token).catch((error: unknown) => {
    status = 'error'
    errorMessage = error instanceof Error ? error.message : 'Unknown login error'
    console.error('Discord bot login failed:', error)
  })

  const getPresenceStatus = async (
    userId: string,
  ): Promise<'online' | 'idle' | 'dnd' | 'offline'> => {
    if (status !== 'ready' || !guildId) return 'offline'
    try {
      const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId))
      const member =
        guild.members.cache.get(userId) ??
        (await guild.members.fetch({ user: userId, cache: true, force: false }))
      const raw = member.presence?.status
      if (raw === 'online' || raw === 'idle' || raw === 'dnd') return raw
      return 'offline'
    } catch {
      return 'offline'
    }
  }

  const requestMembershipApproval = async (
    request: ApprovalRequest,
  ): Promise<ApprovalResult> => {
    if (status !== 'ready') return { decision: 'unavailable' }

    try {
      const requestId = createRequestId()

      const approver = await client.users.fetch(request.approverDiscordId)
      const rows = buildDecisionButtons(requestId)

      await approver.send({
        embeds: [buildRequestEmbed(request.user)],
        components: rows,
      })

      return await new Promise<ApprovalResult>((resolve) => {
        const timeout = setTimeout(() => {
          pending.delete(requestId)
          resolve({ decision: 'timeout' })
        }, Math.max(5_000, request.timeoutMs))

        pending.set(requestId, {
          resolve,
          timeout,
          approverDiscordId: request.approverDiscordId,
        })
      })
    } catch (sendError) {
      console.error('Failed to send approval DM:', sendError)
      return { decision: 'unavailable' }
    }
  }

  return {
    getStatus: () => status,
    getError: () => errorMessage,
    getPresenceStatus,
    requestMembershipApproval,
  }
}
