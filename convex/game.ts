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
import { shuffle } from "./lib/shuffle";

type StartRoundArgs = {
  roomId: Id<'rooms'>
  hostPlayerId: Id<'players'>
  spyCount?: number
}

type RoomRoundArgs = {
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

type EndDiscussionTurnArgs = RoomRoundArgs & {
  playerId: Id<'players'>
}

type AdvanceDiscussionTurnArgs = RoomRoundArgs & {
  discussionOrder: Id<'players'>[]
  currentTurnIndex: number
}

const REVEAL_DURATION_MS = 30_000
const DISCUSSION_TURN_DURATION_MS = 30_000

export async function startRoundHandler(
  ctx: MutationCtx,
  { roomId, hostPlayerId, spyCount }: StartRoundArgs,
) {
  const currentRoom = await ctx.db.get(roomId);
  if (!currentRoom) {
    throw new Error('Room not found.')
  }

  const hostPlayer = await ctx.db.get(hostPlayerId)

  if (!hostPlayer) {
    throw new Error('Host player not found')
  }

  if (!hostPlayer.isHost) {
    throw new Error('Only the host can start the game')
  }

  if (hostPlayer.roomId !== roomId) {
    throw new Error('Host does not belong to this room')
  }

  const roomPlayers = await ctx.db
    .query('players')
    .withIndex('by_roomId', (q) => q.eq('roomId', roomId))
    .collect()

  if (!isValidPlayerCount(roomPlayers.length)) {
    throw new Error('Invalid player count')
  }

  const roomPlayerIds = roomPlayers.map(({ _id }) => _id)
  const currentSpyCount = spyCount ?? getRecommendedSpyCount(roomPlayers.length)
  const assignedRoles = assignRandomRoles(roomPlayerIds, currentSpyCount)

  const existingRounds = await ctx.db
    .query('rounds')
    .withIndex('by_roomId', (q) => q.eq('roomId', roomId))
    .collect()

  const roundNumber = existingRounds.length + 1
  const wordPair = getRandomWordPair()
  const startedAt = Date.now()
  const roundId = await ctx.db.insert('rounds', {
    roomId,
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
      roomId,
      roundId,
      playerId: assignedRole.playerId,
      role: assignedRole.role,
    })
  }

  await ctx.db.patch(roomId, {
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

export async function getRevealStateHandler(
  ctx: QueryCtx,
  { roundId }: GetRoundArgs,
) {
  const round = await ctx.db.get(roundId)

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

export async function getDiscussionStateHandler(
  ctx: QueryCtx,
  { roomId, roundId }: RoomRoundArgs,
) {
  const room = await ctx.db.get(roomId)

  if (!room || room.currentRoundId !== roundId) {
    return null
  }

  const round = await ctx.db.get(roundId)

  if (
    !round ||
    round.roomId !== roomId ||
    !round.discussionOrder ||
    round.currentTurnIndex === undefined ||
    !round.turnStartedAt ||
    !round.turnEndsAt
  ) {
    return null
  }

  const { code, status } = room
  const {
    roundNumber,
    discussionOrder,
    currentTurnIndex,
    turnEndsAt,
  } = round
  const activePlayerId = discussionOrder[currentTurnIndex]

  if (!activePlayerId) {
    return null
  }

  const activePlayer = await ctx.db.get(activePlayerId)

  if (!activePlayer) {
    return null
  }

  return {
    room: {
      code,
      status,
    },
    round: {
      roundNumber,
      activePlayerId,
      activePlayerName: activePlayer.name,
      currentTurn: currentTurnIndex + 1,
      totalTurns: discussionOrder.length,
      turnEndsAt,
      turnStartedAt: round.turnStartedAt
    },
  }
}

export const getDiscussionState = query({
  args: {
    roomId: v.id('rooms'),
    roundId: v.id('rounds'),
  },
  handler: getDiscussionStateHandler,
})

export async function endDiscussionTurnHandler(
  ctx: MutationCtx,
  { roomId, roundId, playerId }: EndDiscussionTurnArgs,
) {
  const room = await ctx.db.get(roomId)

  if (!room) {
    throw new Error('Room not found.')
  }

  if (
    room.status !== GAME_STATUS.DISCUSSION ||
    room.currentRoundId !== roundId
  ) {
    throw new Error('Room is not in the current discussion.')
  }

  const round = await ctx.db.get(roundId)

  if (!round || round.roomId !== roomId) {
    throw new Error('Round not found.')
  }

  if (
    !round.discussionOrder ||
    round.currentTurnIndex === undefined ||
    round.turnStartedAt === undefined ||
    round.turnEndsAt === undefined
  ) {
    throw new Error('Discussion state is incomplete.')
  }

  const activePlayerId = round.discussionOrder[round.currentTurnIndex]

  if (activePlayerId !== playerId) {
    throw new Error('Only the active player can end their turn.')
  }

  return await advanceDiscussionTurn(ctx, {
    roomId,
    roundId,
    discussionOrder: round.discussionOrder,
    currentTurnIndex: round.currentTurnIndex,
  })
}

export const endDiscussionTurn = mutation({
  args: {
    roomId: v.id('rooms'),
    roundId: v.id('rounds'),
    playerId: v.id('players'),
  },
  handler: endDiscussionTurnHandler,
})

async function advanceDiscussionTurn(
  ctx: MutationCtx,
  {
    roomId,
    roundId,
    discussionOrder,
    currentTurnIndex,
  }: AdvanceDiscussionTurnArgs,
) {
  const nextTurnIndex = currentTurnIndex + 1

  if (nextTurnIndex >= discussionOrder.length) {
    await ctx.db.patch(roomId, {
      status: GAME_STATUS.VOTING,
    })

    return {
      advanced: true,
      votingStarted: true,
    }
  }

  const turnStartedAt = Date.now()

  await ctx.db.patch(roundId, {
    currentTurnIndex: nextTurnIndex,
    turnStartedAt,
    turnEndsAt: turnStartedAt + DISCUSSION_TURN_DURATION_MS,
  })

  return {
    advanced: true,
    votingStarted: false,
  }
}

export async function advanceDiscussionIfExpiredHandler(
  ctx: MutationCtx,
  { roomId, roundId }: RoomRoundArgs,
) {
  const room = await ctx.db.get(roomId)

  if (!room) {
    throw new Error('Room not found.')
  }

  if (room.status !== GAME_STATUS.DISCUSSION) {
    return { advanced: false, votingStarted: false }
  }

  if (room.currentRoundId !== roundId) {
    throw new Error('Round does not belong to current room state.')
  }

  const round = await ctx.db.get(roundId)

  if (!round || round.roomId !== roomId) {
    throw new Error('Round not found.')
  }

  if (
    !round.discussionOrder ||
    round.currentTurnIndex === undefined ||
    round.turnEndsAt === undefined
  ) {
    throw new Error('Discussion state is incomplete.')
  }

  if (Date.now() < round.turnEndsAt) {
    return { advanced: false, votingStarted: false }
  }

  return await advanceDiscussionTurn(ctx, {
    roomId,
    roundId,
    discussionOrder: round.discussionOrder,
    currentTurnIndex: round.currentTurnIndex,
  })
}

export const advanceDiscussionIfExpired = mutation({
  args: {
    roomId: v.id('rooms'),
    roundId: v.id('rounds'),
  },
  handler: advanceDiscussionIfExpiredHandler,
})

export async function getMyRoleHandler(
  ctx: QueryCtx,
  { roundId, playerId }: RoundPlayerArgs,
) {
  return await ctx.db
    .query('roleAssignments')
    .withIndex('by_roundId_playerId', (q) =>
      q.eq('roundId', roundId).eq('playerId', playerId)
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

export async function getMyRevealHandler(
  ctx: QueryCtx,
  { roundId, playerId }: RoundPlayerArgs,
) {
  const round = await ctx.db.get(roundId)

  if (!round) {
    return null
  }

  const roleAssignment = await getMyRoleHandler(ctx, { roundId, playerId })

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

export async function markRoleSeenHandler(
  ctx: MutationCtx,
  { roundId, playerId }: RoundPlayerArgs,
) {
  const roleAssignment = await getMyRoleHandler(ctx, { roundId, playerId })

  if (!roleAssignment) {
    throw new Error('Role assignment not found.')
  }

  const seenAt = roleAssignment.seenAt ?? Date.now()

  if (!roleAssignment.seenAt) {
    await ctx.db.patch(roleAssignment._id, { seenAt })
  }

  const roleAssignments = await ctx.db
    .query('roleAssignments')
    .withIndex('by_roundId', (q) => q.eq("roundId", roundId))
    .collect()

  const haveAllPlayersSeenRole = roleAssignments.every(
    (assignment) => assignment.seenAt,
  )
  const room = await ctx.db.get(roleAssignment.roomId)

  if (!room) {
    throw new Error('Room not found.')
  }
  if (haveAllPlayersSeenRole &&
    room.status === GAME_STATUS.ROLE_REVEAL &&
    room.currentRoundId === roundId) {
    await startDiscussion(ctx, {
      roomId: roleAssignment.roomId,
      roundId
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
  { roomId, roundId }: RoomRoundArgs,
) {
  const room = await ctx.db.get(roomId)

  if (!room) {
    throw new Error('Room not found.')
  }

  if (room.status !== GAME_STATUS.ROLE_REVEAL) {
    return { advanced: false }
  }

  if (room.currentRoundId !== roundId) {
    throw new Error('Round does not belong to current room state.')
  }

  const round = await ctx.db.get(roundId)

  if (!round) {
    throw new Error('Round not found.')
  }

  if (!round.revealEndsAt || Date.now() < round.revealEndsAt) {
    return { advanced: false }
  }

  await startDiscussion(ctx, {
    roomId,
    roundId
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

async function startDiscussion(
  ctx: MutationCtx,
  { roomId, roundId }: RoomRoundArgs,
) {
  const players = await ctx.db
    .query('players')
    .withIndex('by_roomId', (q) => q.eq('roomId', roomId))
    .collect()

  const discussionOrder = shuffle(players.map(player => player._id))

  const turnStartedAt = Date.now()

  if (discussionOrder.length === 0) {
    throw new Error('Cannot start discussion without players.')
  }

  await ctx.db.patch(roundId, {
    discussionOrder,
    currentTurnIndex: 0,
    turnStartedAt,
    turnEndsAt: Date.now() + DISCUSSION_TURN_DURATION_MS
  })

  await ctx.db.patch(roomId, {
    status: GAME_STATUS.DISCUSSION
  })
}
