import { GAME_STATUS } from "../../shared/gameStatus"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { INDEX, TABLE } from "../lib/db"
import { getActivePlayersByRoom } from "./activePlayers"
import { CATEGORY_SUGGESTION_DURATION_MS, CATEGORY_VOTING_DURATION_MS, WORD_SUBMISSION_DURATION_MS } from "./constants"
import { GAME_ERROR } from "./errors"
import { getCurrentPhaseRound } from "./phaseGuard"
import type { PhaseStateArgs, RoomRoundArgs, SubmitCategorySuggestionArgs } from "./types"

async function getSuggestionsByRound(ctx: QueryCtx | MutationCtx, roundId: RoomRoundArgs['roundId']) {
  return await ctx.db
    .query(TABLE.CATEGORY_SUGGESTIONS)
    .withIndex(INDEX.CATEGORY_SUGGESTIONS_BY_ROUND_ID, (q) => q.eq('roundId', roundId))
    .collect()
}

export async function submitCategorySuggestionHandler(
  ctx: MutationCtx,
  { roomId, roundId, playerId, text }: SubmitCategorySuggestionArgs,
) {
  await getCurrentPhaseRound(ctx, { roomId, roundId }, GAME_STATUS.CATEGORY_SUGGESTION, GAME_ERROR.ROOM_NOT_IN_CATEGORY_SUGGESTION)

  const player = await ctx.db.get(playerId)
  if (!player || player.roomId !== roomId || player.isEliminated) {
    throw new Error(GAME_ERROR.PLAYER_NOT_IN_ROOM)
  }

  const trimmedText = text.trim()
  if (!trimmedText) {
    throw new Error(GAME_ERROR.EMPTY_SUBMISSION)
  }

  const existingSuggestion = await ctx.db
    .query(TABLE.CATEGORY_SUGGESTIONS)
    .withIndex(INDEX.CATEGORY_SUGGESTIONS_BY_ROUND_ID_PLAYER_ID, (q) =>
      q.eq('roundId', roundId).eq('playerId', playerId))
    .unique()

  let suggestionId = existingSuggestion?._id
  if (existingSuggestion) {
    await ctx.db.patch(existingSuggestion._id, { text: trimmedText })
  } else {
    suggestionId = await ctx.db.insert(TABLE.CATEGORY_SUGGESTIONS, {
      roomId,
      roundId,
      playerId,
      text: trimmedText,
      createdAt: Date.now(),
    })
  }

  const [suggestions, activePlayers] = await Promise.all([
    getSuggestionsByRound(ctx, roundId),
    getActivePlayersByRoom(ctx, roomId),
  ])
  const suggesterIds = new Set(suggestions.map((s) => s.playerId))
  const haveAllActivePlayersSuggested = activePlayers.every((p) => suggesterIds.has(p._id))

  if (haveAllActivePlayersSuggested) {
    await finishCategorySuggestion(ctx, { roomId, roundId })
  }

  return { suggestionId: suggestionId!, isUpdated: Boolean(existingSuggestion) }
}

export async function getCategorySuggestionStateHandler(
  ctx: QueryCtx,
  { roomId, roundId, playerId }: PhaseStateArgs,
) {
  const room = await ctx.db.get(roomId)
  if (!room || room.status !== GAME_STATUS.CATEGORY_SUGGESTION || room.currentRoundId !== roundId) {
    return null
  }

  const round = await ctx.db.get(roundId)
  if (!round) return null

  const [suggestions, activePlayers] = await Promise.all([
    getSuggestionsByRound(ctx, roundId),
    getActivePlayersByRoom(ctx, roomId),
  ])
  const activePlayerIds = new Set(activePlayers.map((p) => p._id))

  return {
    suggestionEndsAt: round.suggestionEndsAt ?? null,
    suggestedCount: suggestions.filter((s) => activePlayerIds.has(s.playerId)).length,
    activePlayerCount: activePlayers.length,
    hasSuggested: playerId ? suggestions.some((s) => s.playerId === playerId) : false,
  }
}

export async function advanceCategorySuggestionIfExpiredHandler(
  ctx: MutationCtx,
  { roomId, roundId }: RoomRoundArgs,
) {
  const room = await ctx.db.get(roomId)
  if (!room) throw new Error(GAME_ERROR.ROOM_NOT_FOUND)
  if (room.status !== GAME_STATUS.CATEGORY_SUGGESTION) return { advanced: false }
  if (room.currentRoundId !== roundId) throw new Error(GAME_ERROR.NOT_CURRENT_ROOM_ROUND)

  const round = await ctx.db.get(roundId)
  if (!round || round.roomId !== roomId) throw new Error(GAME_ERROR.ROUND_NOT_FOUND)

  if (!round.suggestionEndsAt || Date.now() < round.suggestionEndsAt) {
    return { advanced: false }
  }

  await finishCategorySuggestion(ctx, { roomId, roundId })
  return { advanced: true }
}

async function finishCategorySuggestion(ctx: MutationCtx, { roomId, roundId }: RoomRoundArgs) {
  const suggestions = await getSuggestionsByRound(ctx, roundId)
  const now = Date.now()

  if (suggestions.length === 0) {
    await ctx.db.patch(roundId, { suggestionEndsAt: now + CATEGORY_SUGGESTION_DURATION_MS })
    return
  }

  if (suggestions.length === 1) {
    await ctx.db.patch(roundId, {
      category: suggestions[0].text,
      wordSubmissionEndsAt: now + WORD_SUBMISSION_DURATION_MS,
    })
    await ctx.db.patch(roomId, { status: GAME_STATUS.WORD_SUBMISSION })
    return
  }

  await ctx.db.patch(roundId, { categoryVoteEndsAt: now + CATEGORY_VOTING_DURATION_MS })
  await ctx.db.patch(roomId, { status: GAME_STATUS.CATEGORY_VOTING })
}
