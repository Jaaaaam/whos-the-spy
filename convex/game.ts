import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  assignRandomRoles,
  getRecommendedSpyCount,
  isValidPlayerCount,
} from "./gameRules";
import { getRandomWordPair } from "./wordPairs";
import { GAME_STATUS } from "../shared/gameStatus";

type StartRoundArgs = {
  roomId: Id<'rooms'>
  hostPlayerId: Id<'players'>
  spyCount?: number
}

type AdvanceRevealIfExpiredArgs = {
  roomId: Id<'rooms'>
  roundId: Id<'rounds'>
}

type GetRoundArgs = {
  roundId: Id<'rounds'>
}

type RoundPlayerArgs = {
  roundId: Id<'rounds'>
  playerId: Id<'players'>
}

const REVEAL_DURATION_MS = 30_000

export async function startRoundHandler(ctx: MutationCtx, args: StartRoundArgs) {
  const currentRoom = await ctx.db.get(args.roomId);
  if (!currentRoom) {
    throw new Error('Room not found.')
  }

  const hostPlayer = await ctx.db.get(args.hostPlayerId)

  if (!hostPlayer) {
    throw new Error('Host player not found')
  }

  if (!hostPlayer.isHost) {
    throw new Error('Only the host can start the game')
  }

  if (hostPlayer.roomId !== args.roomId) {
    throw new Error('Host does not belong to this room')
  }

  const roomPlayers = await ctx.db
    .query('players')
    .withIndex('by_roomId', (q) => q.eq('roomId', args.roomId))
    .collect()

  if (!isValidPlayerCount(roomPlayers.length)) {
    throw new Error('Invalid player count')
  }

  const roomPlayerIds = roomPlayers.map(({ _id }) => _id)
  const currentSpyCount = args.spyCount ?? getRecommendedSpyCount(roomPlayers.length)
  const assignedRoles = assignRandomRoles(roomPlayerIds, currentSpyCount)

  const existingRounds = await ctx.db
    .query('rounds')
    .withIndex('by_roomId', (q) => q.eq('roomId', args.roomId))
    .collect()

  const roundNumber = existingRounds.length + 1
  const wordPair = getRandomWordPair()
  const startedAt = Date.now()
  const roundId = await ctx.db.insert('rounds', {
    roomId: args.roomId,
    mode: 'similar_words',
    civilianWord: wordPair.civilianWord,
    spyWord: wordPair.spyWord,
    spyCount: currentSpyCount,
    roundNumber,
    startedAt,
    revealEndsAt: startedAt + REVEAL_DURATION_MS
  })

  for (const assignedRole of assignedRoles) {
    await ctx.db.insert('roleAssignments', {
      roomId: args.roomId,
      roundId,
      playerId: assignedRole.playerId,
      role: assignedRole.role,
    })
  }

  await ctx.db.patch(args.roomId, {
    status: GAME_STATUS.ROLE_REVEAL,
    currentRoundId: roundId,
  })

  return {
    roundId,
    spyCount: currentSpyCount,
    roundNumber
  }
}

export const startRound = mutation({
  args: {
    roomId: v.id('rooms'),
    hostPlayerId: v.id('players'),
    spyCount: v.optional(v.number())
  },
  handler: startRoundHandler,
})

export async function getRevealStateHandler(ctx: QueryCtx, args: GetRoundArgs) {
  const round = await ctx.db.get(args.roundId)

  if (!round) {
    return null
  }

  return {
    roundNumber: round.roundNumber,
    revealEndsAt: round.revealEndsAt,
  }
}

export const getRevealState = query({
  args: {
    roundId: v.id('rounds'),
  },
  handler: getRevealStateHandler,
})

export async function getMyRoleHandler(ctx: QueryCtx, args: RoundPlayerArgs) {
  return await ctx.db
    .query('roleAssignments')
    .withIndex('by_roundId_playerId', (q) =>
      q.eq('roundId', args.roundId).eq('playerId', args.playerId)
    )
    .unique()
}

export const getMyRole = query({
  args: {
    roundId: v.id('rounds'),
    playerId: v.id('players'),
  },
  handler: getMyRoleHandler,
})

export async function getMyRevealHandler(ctx: QueryCtx, args: RoundPlayerArgs) {
  const round = await ctx.db.get(args.roundId)

  if (!round) {
    return null
  }

  const roleAssignment = await getMyRoleHandler(ctx, args)

  if (!roleAssignment) {
    return null
  }

  return {
    word: roleAssignment.role === 'spy' ? round.spyWord : round.civilianWord,
    seenAt: roleAssignment.seenAt,
  }
}

export const getMyReveal = query({
  args: {
    roundId: v.id('rounds'),
    playerId: v.id('players'),
  },
  handler: getMyRevealHandler,
})

export async function markRoleSeenHandler(ctx: MutationCtx, args: RoundPlayerArgs) {
  const roleAssignment = await getMyRoleHandler(ctx, args)

  if (!roleAssignment) {
    throw new Error('Role assignment not found.')
  }

  const seenAt = roleAssignment.seenAt ?? Date.now()

  if (!roleAssignment.seenAt) {
    await ctx.db.patch(roleAssignment._id, { seenAt })
  }

  const roleAssignments = await ctx.db
    .query('roleAssignments')
    .withIndex('by_roundId', (q) => q.eq("roundId", args.roundId))
    .collect()

  const haveAllPlayersSeenRole = roleAssignments.every(
    (assignment) => assignment.seenAt,
  )

  if (haveAllPlayersSeenRole) {
    await ctx.db.patch(roleAssignment.roomId, {
      status: GAME_STATUS.DISCUSSION
    })
  }
  return { seenAt }
}

export const markRoleSeen = mutation({
  args: {
    roundId: v.id('rounds'),
    playerId: v.id('players'),
  },
  handler: markRoleSeenHandler
})

export async function advanceRevealIfExpiredHandler(
  ctx: MutationCtx,
  args: AdvanceRevealIfExpiredArgs,
) {
  const room = await ctx.db.get(args.roomId)

  if (!room) {
    throw new Error('Room not found.')
  }

  if (room.status !== GAME_STATUS.ROLE_REVEAL) {
    return { advanced: false }
  }

  if (room.currentRoundId !== args.roundId) {
    throw new Error('Round does not belong to current room state.')
  }

  const round = await ctx.db.get(args.roundId)

  if (!round) {
    throw new Error('Round not found.')
  }

  if (!round.revealEndsAt || Date.now() < round.revealEndsAt) {
    return { advanced: false }
  }

  await ctx.db.patch(args.roomId, {
    status: GAME_STATUS.DISCUSSION,
  })

  return { advanced: true }
}

export const advanceRevealIfExpired = mutation({
  args: {
    roomId: v.id('rooms'),
    roundId: v.id('rounds'),
  },
  handler: advanceRevealIfExpiredHandler,
})
