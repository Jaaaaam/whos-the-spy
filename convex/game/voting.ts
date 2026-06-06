import { GAME_STATUS } from "../../shared/gameStatus"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { INDEX, TABLE } from "../lib/db"
import { GAME_ERROR } from "./errors"
import type { CastVoteArgs, RoomRoundArgs } from "./types"

async function getCurrentVotingRound(ctx: QueryCtx | MutationCtx, { roomId, roundId }: RoomRoundArgs) {
  const room = await ctx.db.get(roomId)
  if (!room) {
    throw new Error(GAME_ERROR.ROOM_NOT_FOUND)
  }
  if (room.status !== GAME_STATUS.VOTING) {
    throw new Error(GAME_ERROR.ROOM_NOT_IN_CURRENT_VOTING)
  }
  if (room.currentRoundId !== roundId) {
    throw new Error(GAME_ERROR.NOT_CURRENT_ROOM_ROUND)
  }

  const round = await ctx.db.get(roundId)

  if (!round || round.roomId !== roomId) {
    throw new Error(GAME_ERROR.ROUND_NOT_FOUND)
  }

  return { room, round }
}

async function getActivePlayersByRoom(ctx: QueryCtx | MutationCtx, roomId: RoomRoundArgs['roomId']) {
  const playersInRoom = await ctx.db
    .query(TABLE.PLAYERS)
    .withIndex(INDEX.PLAYERS_BY_ROOM_ID, (q) =>
      q.eq('roomId', roomId))
    .collect()

  return playersInRoom.filter(player => player.isConnected)
}

async function getVotesByRoomRound(ctx: QueryCtx | MutationCtx, { roomId, roundId }: RoomRoundArgs) {
  return await ctx.db
    .query(TABLE.VOTES)
    .withIndex(INDEX.VOTES_BY_ROOM_ID_ROUND_ID, (q) =>
      q.eq('roomId', roomId).eq('roundId', roundId))
    .collect()
}

export async function castVoteHandler(ctx: MutationCtx, { roundId, roomId, voterPlayerId, targetPlayerId }: CastVoteArgs) {
  await getCurrentVotingRound(ctx, { roomId, roundId })

  const voter = await ctx.db.get(voterPlayerId);

  if (!voter || voter.roomId !== roomId || !voter.isConnected) {
    throw new Error(GAME_ERROR.VOTER_NOT_IN_ROOM)
  }

  const target = await ctx.db.get(targetPlayerId)

  if (!target || target.roomId !== roomId || !target.isConnected) {
    throw new Error(GAME_ERROR.TARGET_NOT_IN_ROOM)
  }

  if (voterPlayerId === targetPlayerId) {
    throw new Error(GAME_ERROR.CANNOT_VOTE_SELF)
  }

  const existingVote = await ctx.db
    .query(TABLE.VOTES)
    .withIndex(INDEX.VOTES_BY_ROUND_ID_VOTER_PLAYER_ID, (q) =>
      q.eq('roundId', roundId).eq('voterPlayerId', voterPlayerId))
    .unique()

  const now = Date.now()

  if (existingVote) {
    await ctx.db.patch(existingVote._id, {
      targetPlayerId,
      updatedAt: now
    })
    return {
      vote: existingVote._id,
      isUpdated: true
    }
  }

  const voteId = await ctx.db.insert(TABLE.VOTES, {
    roomId,
    roundId,
    voterPlayerId,
    targetPlayerId,
    createdAt: now,
    updatedAt: now
  })

  return {
    vote: voteId,
    isUpdated: false
  }
}

export async function getVoteProgressHandler(ctx: QueryCtx, { roomId, roundId }: RoomRoundArgs) {
  await getCurrentVotingRound(ctx, { roomId, roundId })
  const activePlayers = await getActivePlayersByRoom(ctx, roomId)
  const activePlayerIds = new Set(activePlayers.map(player => player._id))
  const votes = await getVotesByRoomRound(ctx, { roomId, roundId })

  const activeVotes = votes.filter((vote) => activePlayerIds.has(vote.voterPlayerId))

  return {
    votedCount: activeVotes.length,
    eligibleVoterCount: activePlayers.length,
    isComplete: activeVotes.length === activePlayers.length
  }

}

export async function getVotingResultsHandler(ctx: QueryCtx, { roomId, roundId }: RoomRoundArgs) {
  await getCurrentVotingRound(ctx, { roomId, roundId })
  const activePlayers = await getActivePlayersByRoom(ctx, roomId)
  const activePlayerIds = new Set(activePlayers.map(player => player._id))
  const votes = await getVotesByRoomRound(ctx, { roomId, roundId })
  const voteCounts = new Map(activePlayers.map(player => [player._id, 0]))

  for (const vote of votes) {
    if (
      !activePlayerIds.has(vote.voterPlayerId) ||
      !activePlayerIds.has(vote.targetPlayerId)
    ) {
      continue
    }

    voteCounts.set(
      vote.targetPlayerId,
      (voteCounts.get(vote.targetPlayerId) ?? 0) + 1,
    )
  }

  const results = activePlayers
    .map(player => ({
      playerId: player._id,
      playerName: player.name,
      voteCount: voteCounts.get(player._id) ?? 0,
    }))
    .sort((left, right) => {
      if (right.voteCount !== left.voteCount) {
        return right.voteCount - left.voteCount
      }

      return left.playerName.localeCompare(right.playerName)
    })

  return {
    totalVotes: results.reduce((total, result) => total + result.voteCount, 0),
    results,
  }
}
