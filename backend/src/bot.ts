import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  type ButtonInteraction,
} from 'discord.js'

export type BotStatus = 'disabled' | 'connecting' | 'ready' | 'error'

export type ApprovalDecision = 'approved' | 'declined' | 'timeout' | 'unavailable'

type ApprovalUser = {
  id: string
  username: string
  displayName: string
}

type ApprovalRequest = {
  approverDiscordId: string
  user: ApprovalUser
  timeoutMs: number
}

type PendingApproval = {
  resolve: (decision: ApprovalDecision) => void
  timeout: NodeJS.Timeout
  approverDiscordId: string
}

export type BotHandle = {
  getStatus: () => BotStatus
  getError: () => string | null
  requestMembershipApproval: (request: ApprovalRequest) => Promise<ApprovalDecision>
}

const APPROVE_PREFIX = 'west_approve:'
const DECLINE_PREFIX = 'west_decline:'

function createRequestId(): string {
  return Math.random().toString(36).slice(2, 10)
}

async function finalizeInteractionMessage(
  interaction: ButtonInteraction,
  decision: Exclude<ApprovalDecision, 'timeout' | 'unavailable'>,
): Promise<void> {
  const label = decision === 'approved' ? 'ACCEPTED' : 'DECLINED'
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('west_done_accept')
      .setLabel(`Request ${label}`)
      .setStyle(decision === 'approved' ? ButtonStyle.Success : ButtonStyle.Danger)
      .setDisabled(true),
  )

  await interaction.update({
    components: [row],
  })
}

export function startDiscordBot(token?: string): BotHandle {
  let status: BotStatus = 'disabled'
  let errorMessage: string | null = null
  const pending = new Map<string, PendingApproval>()

  if (!token) {
    return {
      getStatus: () => status,
      getError: () => errorMessage,
      requestMembershipApproval: async () => 'unavailable',
    }
  }

  status = 'connecting'
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel],
  })

  client.once(Events.ClientReady, () => {
    status = 'ready'
    console.log(`Discord bot ready as ${client.user?.tag ?? 'unknown'}`)
  })

  client.on(Events.Error, (error) => {
    status = 'error'
    errorMessage = error.message
    console.error('Discord bot error:', error)
  })

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return

    const customId = interaction.customId
    const isApprove = customId.startsWith(APPROVE_PREFIX)
    const isDecline = customId.startsWith(DECLINE_PREFIX)
    if (!isApprove && !isDecline) return

    const requestId = customId.split(':')[1]
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

    const decision: Exclude<ApprovalDecision, 'timeout' | 'unavailable'> = isApprove
      ? 'approved'
      : 'declined'

    try {
      await finalizeInteractionMessage(interaction, decision)
    } catch (messageError) {
      console.error('Failed to update approval message:', messageError)
    }

    request.resolve(decision)
  })

  void client.login(token).catch((error: unknown) => {
    status = 'error'
    errorMessage = error instanceof Error ? error.message : 'Unknown login error'
    console.error('Discord bot login failed:', error)
  })

  const requestMembershipApproval = async (
    request: ApprovalRequest,
  ): Promise<ApprovalDecision> => {
    if (status !== 'ready') return 'unavailable'

    try {
      const requestId = createRequestId()
      const approveId = `${APPROVE_PREFIX}${requestId}`
      const declineId = `${DECLINE_PREFIX}${requestId}`

      const approver = await client.users.fetch(request.approverDiscordId)
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(approveId)
          .setLabel('Accept')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(declineId)
          .setLabel('Decline')
          .setStyle(ButtonStyle.Danger),
      )

      await approver.send({
        content: [
          `Discord Name: ${request.user.displayName} (@${request.user.username})`,
          `Discord ID: ${request.user.id}`,
          'This user wants to log in and be part of your group.',
        ].join('\n'),
        components: [row],
      })

      return await new Promise<ApprovalDecision>((resolve) => {
        const timeout = setTimeout(() => {
          pending.delete(requestId)
          resolve('timeout')
        }, Math.max(5_000, request.timeoutMs))

        pending.set(requestId, {
          resolve,
          timeout,
          approverDiscordId: request.approverDiscordId,
        })
      })
    } catch (sendError) {
      console.error('Failed to send approval DM:', sendError)
      return 'unavailable'
    }
  }

  return {
    getStatus: () => status,
    getError: () => errorMessage,
    requestMembershipApproval,
  }
}
