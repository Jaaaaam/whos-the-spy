import type { MutationCtx, QueryCtx } from "../_generated/server"
import { GAME_MODE } from "../../shared/gameMode"
import { GAME_STATUS } from "../../shared/gameStatus"
import { INDEX, TABLE } from "../lib/db"
import { startDiscussion } from "./discussion"
import { GAME_ERROR } from "./errors"
import type { GetRoundArgs, RoomRoundArgs, RoundPlayerArgs } from "./types"

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

export async function getMyRoleHandler(
  ctx: QueryCtx,
  { roundId, playerId }: RoundPlayerArgs,
) {
  return await ctx.db
    .query(TABLE.ROLE_ASSIGNMENTS)
    .withIndex(INDEX.ROLE_ASSIGNMENTS_BY_ROUND_ID_PLAYER_ID, (q) =>
      q.eq('roundId', roundId).eq('playerId', playerId)
    )
    .unique()
}

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

  const isSpy = roleAssignment.role === 'spy'
  const isWordlessMode = round.mode === GAME_MODE.WORDLESS_SPY

  return {
    word: (isWordlessMode && isSpy ? null : (isSpy ? round.spyWord : round.civilianWord)) ?? null,
    category: round.category ?? null,
    seenAt: roleAssignment.seenAt,
  }
}

export async function markRoleSeenHandler(
  ctx: MutationCtx,
  { roundId, playerId }: RoundPlayerArgs,
) {
  const roleAssignment = await getMyRoleHandler(ctx, { roundId, playerId })

  if (!roleAssignment) {
    throw new Error(GAME_ERROR.ROLE_ASSIGNMENT_NOT_FOUND)
  }

  const seenAt = roleAssignment.seenAt ?? Date.now()

  if (!roleAssignment.seenAt) {
    await ctx.db.patch(roleAssignment._id, { seenAt })
  }

  const roleAssignments = await ctx.db
    .query(TABLE.ROLE_ASSIGNMENTS)
    .withIndex(INDEX.ROLE_ASSIGNMENTS_BY_ROUND_ID, (q) => q.eq("roundId", roundId))
    .collect()

  const haveAllPlayersSeenRole = roleAssignments.every(
    (assignment) => assignment.seenAt,
  )
  const room = await ctx.db.get(roleAssignment.roomId)

  if (!room) {
    throw new Error(GAME_ERROR.ROOM_NOT_FOUND)
  }

  if (
    haveAllPlayersSeenRole &&
    room.status === GAME_STATUS.ROLE_REVEAL &&
    room.currentRoundId === roundId
  ) {
    await startDiscussion(ctx, {
      roomId: roleAssignment.roomId,
      roundId
    })
  }

  return { seenAt }
}

export async function advanceRevealIfExpiredHandler(
  ctx: MutationCtx,
  { roomId, roundId }: RoomRoundArgs,
) {
  const room = await ctx.db.get(roomId)

  if (!room) {
    throw new Error(GAME_ERROR.ROOM_NOT_FOUND)
  }

  if (room.status !== GAME_STATUS.ROLE_REVEAL) {
    return { advanced: false }
  }

  if (room.currentRoundId !== roundId) {
    throw new Error(GAME_ERROR.NOT_CURRENT_ROOM_ROUND)
  }

  const round = await ctx.db.get(roundId)

  if (!round) {
    throw new Error(GAME_ERROR.ROUND_NOT_FOUND)
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
