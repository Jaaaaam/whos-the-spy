import { GAME_STATUS } from "../../shared/gameStatus"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { INDEX, TABLE } from "../lib/db"
import { getActivePlayersByRoom } from "./activePlayers"
import { REVEAL_DURATION_MS, WORD_SUBMISSION_DURATION_MS } from "./constants"
import { GAME_ERROR } from "./errors"
import { getCurrentPhaseRound } from "./phaseGuard"
import type { PhaseStateArgs, RoomRoundArgs, SubmitWordArgs } from "./types"

async function getWordSubmissionsByRound(ctx: QueryCtx | MutationCtx, roundId: RoomRoundArgs['roundId']) {
  return await ctx.db
    .query(TABLE.WORD_SUBMISSIONS)
    .withIndex(INDEX.WORD_SUBMISSIONS_BY_ROUND_ID, (q) => q.eq('roundId', roundId))
    .collect()
}

export async function submitWordHandler(
  ctx: MutationCtx,
  { roomId, roundId, playerId, word }: SubmitWordArgs,
) {
  await getCurrentPhaseRound(ctx, { roomId, roundId }, GAME_STATUS.WORD_SUBMISSION, GAME_ERROR.ROOM_NOT_IN_WORD_SUBMISSION)

  const player = await ctx.db.get(playerId)
  if (!player || player.roomId !== roomId || player.isEliminated) {
    throw new Error(GAME_ERROR.PLAYER_NOT_IN_ROOM)
  }

  const trimmedWord = word.trim()
  if (!trimmedWord) {
    throw new Error(GAME_ERROR.EMPTY_SUBMISSION)
  }

  const existingSubmission = await ctx.db
    .query(TABLE.WORD_SUBMISSIONS)
    .withIndex(INDEX.WORD_SUBMISSIONS_BY_ROUND_ID_PLAYER_ID, (q) =>
      q.eq('roundId', roundId).eq('playerId', playerId))
    .unique()

  let submissionId = existingSubmission?._id
  if (existingSubmission) {
    await ctx.db.patch(existingSubmission._id, { word: trimmedWord })
  } else {
    submissionId = await ctx.db.insert(TABLE.WORD_SUBMISSIONS, {
      roomId,
      roundId,
      playerId,
      word: trimmedWord,
      createdAt: Date.now(),
    })
  }

  const [submissions, activePlayers] = await Promise.all([
    getWordSubmissionsByRound(ctx, roundId),
    getActivePlayersByRoom(ctx, roomId),
  ])
  const submitterIds = new Set(submissions.map((submission) => submission.playerId))
  const haveAllActivePlayersSubmitted = activePlayers.every((p) => submitterIds.has(p._id))

  if (haveAllActivePlayersSubmitted) {
    await finishWordSubmission(ctx, { roomId, roundId })
  }

  return { submissionId: submissionId!, isUpdated: Boolean(existingSubmission) }
}

export async function getWordSubmissionStateHandler(
  ctx: QueryCtx,
  { roomId, roundId, playerId }: PhaseStateArgs,
) {
  const room = await ctx.db.get(roomId)
  if (!room || room.status !== GAME_STATUS.WORD_SUBMISSION || room.currentRoundId !== roundId) {
    return null
  }

  const round = await ctx.db.get(roundId)
  if (!round || !round.category) return null

  const [submissions, activePlayers] = await Promise.all([
    getWordSubmissionsByRound(ctx, roundId),
    getActivePlayersByRoom(ctx, roomId),
  ])
  const activePlayerIds = new Set(activePlayers.map((p) => p._id))

  return {
    wordSubmissionEndsAt: round.wordSubmissionEndsAt ?? null,
    category: round.category,
    submittedCount: submissions.filter((submission) => activePlayerIds.has(submission.playerId)).length,
    activePlayerCount: activePlayers.length,
    hasSubmitted: playerId ? submissions.some((submission) => submission.playerId === playerId) : false,
  }
}

export async function advanceWordSubmissionIfExpiredHandler(
  ctx: MutationCtx,
  { roomId, roundId }: RoomRoundArgs,
) {
  const room = await ctx.db.get(roomId)
  if (!room) throw new Error(GAME_ERROR.ROOM_NOT_FOUND)
  if (room.status !== GAME_STATUS.WORD_SUBMISSION) return { advanced: false }
  if (room.currentRoundId !== roundId) throw new Error(GAME_ERROR.NOT_CURRENT_ROOM_ROUND)

  const round = await ctx.db.get(roundId)
  if (!round || round.roomId !== roomId) throw new Error(GAME_ERROR.ROUND_NOT_FOUND)

  if (!round.wordSubmissionEndsAt || Date.now() < round.wordSubmissionEndsAt) {
    return { advanced: false }
  }

  await finishWordSubmission(ctx, { roomId, roundId })
  return { advanced: true }
}

async function finishWordSubmission(ctx: MutationCtx, { roomId, roundId }: RoomRoundArgs) {
  const submissions = await getWordSubmissionsByRound(ctx, roundId)
  const now = Date.now()

  if (submissions.length === 0) {
    await ctx.db.patch(roundId, { wordSubmissionEndsAt: now + WORD_SUBMISSION_DURATION_MS })
    return
  }

  const drawnSubmission = submissions[Math.floor(Math.random() * submissions.length)]

  await ctx.db.patch(roundId, {
    civilianWord: drawnSubmission.word,
    revealEndsAt: now + REVEAL_DURATION_MS,
  })
  await ctx.db.patch(roomId, { status: GAME_STATUS.ROLE_REVEAL })
}
