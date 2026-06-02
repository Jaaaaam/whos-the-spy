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

type StartRoundArgs = {
  roomId: Id<'rooms'>
  hostPlayerId: Id<'players'>
  spyCount?: number
}

type GetMyRoleArgs = {
  roundId: Id<'rounds'>
  playerId: Id<'players'>
}

type GetMyRevealArgs = {
  roundId: Id<'rounds'>
  playerId: Id<'players'>
}

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
  const roundId = await ctx.db.insert('rounds', {
    roomId: args.roomId,
    mode: 'similar_words',
    civilianWord: wordPair.civilianWord,
    spyWord: wordPair.spyWord,
    spyCount: currentSpyCount,
    roundNumber,
    startedAt: Date.now(),
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
    status: 'role_reveal',
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

export async function getMyRoleHandler(ctx: QueryCtx, args: GetMyRoleArgs) {
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

export async function getMyRevealHandler(ctx: QueryCtx, args: GetMyRevealArgs) {
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
  }
}

export const getMyReveal = query({
  args: {
    roundId: v.id('rounds'),
    playerId: v.id('players'),
  },
  handler: getMyRevealHandler,
})
