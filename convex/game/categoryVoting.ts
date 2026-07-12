import { GAME_STATUS } from "../../shared/gameStatus"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { INDEX, TABLE } from "../lib/db"
import { getActivePlayersByRoom } from "./activePlayers"
import { WORD_SUBMISSION_DURATION_MS } from "./constants"
import { GAME_ERROR } from "./errors"
import { getCurrentPhaseRound } from "./phaseGuard"
import type { CastCategoryVoteArgs, PhaseStateArgs, RoomRoundArgs } from "./types"

async function getCategoryVotesByRound(ctx: QueryCtx | MutationCtx, roundId: RoomRoundArgs['roundId']) {
  return await ctx.db
    .query(TABLE.CATEGORY_VOTES)
    .withIndex(INDEX.CATEGORY_VOTES_BY_ROUND_ID, (q) => q.eq('roundId', roundId))
    .collect()
}

async function getSuggestionsByRound(ctx: QueryCtx | MutationCtx, roundId: RoomRoundArgs['roundId']) {
  return await ctx.db
    .query(TABLE.CATEGORY_SUGGESTIONS)
    .withIndex(INDEX.CATEGORY_SUGGESTIONS_BY_ROUND_ID, (q) => q.eq('roundId', roundId))
    .collect()
}

export async function castCategoryVoteHandler(
  ctx: MutationCtx,
  { roomId, roundId, voterPlayerId, suggestionId }: CastCategoryVoteArgs,
) {
  await getCurrentPhaseRound(ctx, { roomId, roundId }, GAME_STATUS.CATEGORY_VOTING, GAME_ERROR.ROOM_NOT_IN_CATEGORY_VOTING)

  const voter = await ctx.db.get(voterPlayerId)
  if (!voter || voter.roomId !== roomId || voter.isEliminated) {
    throw new Error(GAME_ERROR.VOTER_NOT_IN_ROOM)
  }

  const suggestion = await ctx.db.get(suggestionId)
  if (!suggestion || suggestion.roundId !== roundId) {
    throw new Error(GAME_ERROR.SUGGESTION_NOT_FOUND)
  }
  if (suggestion.playerId === voterPlayerId) {
    throw new Error(GAME_ERROR.CANNOT_VOTE_OWN_CATEGORY)
  }

  const existingVote = await ctx.db
    .query(TABLE.CATEGORY_VOTES)
    .withIndex(INDEX.CATEGORY_VOTES_BY_ROUND_ID_VOTER_PLAYER_ID, (q) =>
      q.eq('roundId', roundId).eq('voterPlayerId', voterPlayerId))
    .unique()

  const now = Date.now()
  let voteId = existingVote?._id
  if (existingVote) {
    await ctx.db.patch(existingVote._id, { suggestionId, updatedAt: now })
  } else {
    voteId = await ctx.db.insert(TABLE.CATEGORY_VOTES, {
      roomId,
      roundId,
      voterPlayerId,
      suggestionId,
      createdAt: now,
      updatedAt: now,
    })
  }

  const [votes, activePlayers] = await Promise.all([
    getCategoryVotesByRound(ctx, roundId),
    getActivePlayersByRoom(ctx, roomId),
  ])
  const voterIds = new Set(votes.map((vote) => vote.voterPlayerId))
  const haveAllActivePlayersVoted = activePlayers.every((p) => voterIds.has(p._id))

  if (haveAllActivePlayersVoted) {
    await finishCategoryVoting(ctx, { roomId, roundId })
  }

  return { voteId: voteId!, isUpdated: Boolean(existingVote) }
}

export async function getCategoryVotingStateHandler(
  ctx: QueryCtx,
  { roomId, roundId, playerId }: PhaseStateArgs,
) {
  const room = await ctx.db.get(roomId)
  if (!room || room.status !== GAME_STATUS.CATEGORY_VOTING || room.currentRoundId !== roundId) {
    return null
  }

  const round = await ctx.db.get(roundId)
  if (!round) return null

  const [suggestions, votes, activePlayers] = await Promise.all([
    getSuggestionsByRound(ctx, roundId),
    getCategoryVotesByRound(ctx, roundId),
    getActivePlayersByRoom(ctx, roomId),
  ])
  const activePlayerIds = new Set(activePlayers.map((p) => p._id))
  const myVote = playerId ? votes.find((vote) => vote.voterPlayerId === playerId) : undefined

  return {
    categoryVoteEndsAt: round.categoryVoteEndsAt ?? null,
    suggestions: suggestions.map((suggestion) => ({
      suggestionId: suggestion._id,
      text: suggestion.text,
      isMine: suggestion.playerId === playerId,
    })),
    votedCount: votes.filter((vote) => activePlayerIds.has(vote.voterPlayerId)).length,
    activePlayerCount: activePlayers.length,
    myVoteSuggestionId: myVote?.suggestionId ?? null,
  }
}

export async function advanceCategoryVotingIfExpiredHandler(
  ctx: MutationCtx,
  { roomId, roundId }: RoomRoundArgs,
) {
  const room = await ctx.db.get(roomId)
  if (!room) throw new Error(GAME_ERROR.ROOM_NOT_FOUND)
  if (room.status !== GAME_STATUS.CATEGORY_VOTING) return { advanced: false }
  if (room.currentRoundId !== roundId) throw new Error(GAME_ERROR.NOT_CURRENT_ROOM_ROUND)

  const round = await ctx.db.get(roundId)
  if (!round || round.roomId !== roomId) throw new Error(GAME_ERROR.ROUND_NOT_FOUND)

  if (!round.categoryVoteEndsAt || Date.now() < round.categoryVoteEndsAt) {
    return { advanced: false }
  }

  await finishCategoryVoting(ctx, { roomId, roundId })
  return { advanced: true }
}

async function finishCategoryVoting(ctx: MutationCtx, { roomId, roundId }: RoomRoundArgs) {
  const [suggestions, votes] = await Promise.all([
    getSuggestionsByRound(ctx, roundId),
    getCategoryVotesByRound(ctx, roundId),
  ])

  const voteCounts = new Map(suggestions.map((suggestion) => [suggestion._id, 0]))
  for (const vote of votes) {
    if (!voteCounts.has(vote.suggestionId)) continue
    voteCounts.set(vote.suggestionId, (voteCounts.get(vote.suggestionId) ?? 0) + 1)
  }

  const topCount = Math.max(0, ...voteCounts.values())
  const topSuggestions = suggestions.filter((suggestion) => voteCounts.get(suggestion._id) === topCount)
  const winner = topSuggestions[Math.floor(Math.random() * topSuggestions.length)]

  const now = Date.now()
  await ctx.db.patch(roundId, {
    category: winner.text,
    wordSubmissionEndsAt: now + WORD_SUBMISSION_DURATION_MS,
  })
  await ctx.db.patch(roomId, { status: GAME_STATUS.WORD_SUBMISSION })
}
