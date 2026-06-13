import type { MutationCtx, QueryCtx } from "../_generated/server"
import { GAME_STATUS } from "../../shared/gameStatus"
import { INDEX, TABLE } from "../lib/db"
import { shuffle } from "../lib/shuffle"
import { DISCUSSION_TURN_DURATION_MS } from "./constants"
import { GAME_ERROR } from "./errors"
import type {
  AdvanceDiscussionTurnArgs,
  EndDiscussionTurnArgs,
  RoomRoundArgs,
} from "./types"

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

export async function endDiscussionTurnHandler(
  ctx: MutationCtx,
  { roomId, roundId, playerId }: EndDiscussionTurnArgs,
) {
  const room = await ctx.db.get(roomId)

  if (!room) {
    throw new Error(GAME_ERROR.ROOM_NOT_FOUND)
  }

  if (
    room.status !== GAME_STATUS.DISCUSSION ||
    room.currentRoundId !== roundId
  ) {
    throw new Error(GAME_ERROR.ROOM_NOT_IN_CURRENT_DISCUSSION)
  }

  const round = await ctx.db.get(roundId)

  if (!round || round.roomId !== roomId) {
    throw new Error(GAME_ERROR.ROUND_NOT_FOUND)
  }

  if (
    !round.discussionOrder ||
    round.currentTurnIndex === undefined ||
    round.turnStartedAt === undefined ||
    round.turnEndsAt === undefined
  ) {
    throw new Error(GAME_ERROR.DISCUSSION_STATE_INCOMPLETE)
  }

  const activePlayerId = round.discussionOrder[round.currentTurnIndex]

  if (activePlayerId !== playerId) {
    throw new Error(GAME_ERROR.NOT_ACTIVE_DISCUSSION_PLAYER)
  }

  return await advanceDiscussionTurn(ctx, {
    roomId,
    roundId,
    discussionOrder: round.discussionOrder,
    currentTurnIndex: round.currentTurnIndex,
  })
}

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
    throw new Error(GAME_ERROR.ROOM_NOT_FOUND)
  }

  if (room.status !== GAME_STATUS.DISCUSSION) {
    return { advanced: false, votingStarted: false }
  }

  if (room.currentRoundId !== roundId) {
    throw new Error(GAME_ERROR.NOT_CURRENT_ROOM_ROUND)
  }

  const round = await ctx.db.get(roundId)

  if (!round || round.roomId !== roomId) {
    throw new Error(GAME_ERROR.ROUND_NOT_FOUND)
  }

  if (
    !round.discussionOrder ||
    round.currentTurnIndex === undefined ||
    round.turnEndsAt === undefined
  ) {
    throw new Error(GAME_ERROR.DISCUSSION_STATE_INCOMPLETE)
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

export async function startDiscussion(
  ctx: MutationCtx,
  { roomId, roundId }: RoomRoundArgs,
) {
  const players = await ctx.db
    .query(TABLE.PLAYERS)
    .withIndex(INDEX.PLAYERS_BY_ROOM_ID, (q) => q.eq('roomId', roomId))
    .collect()

  const activePlayers = players.filter(player => player.isConnected && !player.isEliminated)
  const discussionOrder = shuffle(activePlayers.map(player => player._id))
  const turnStartedAt = Date.now()

  if (discussionOrder.length === 0) {
    throw new Error(GAME_ERROR.CANNOT_START_DISCUSSION_WITHOUT_PLAYERS)
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
