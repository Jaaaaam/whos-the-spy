import { GAME_STATUS } from "../../shared/gameStatus"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { INDEX, TABLE } from "../lib/db"
import { BATTLE_REVEAL_DURATION_MS, DISCUSSION_TURN_DURATION_MS } from "./constants"
import { GAME_ERROR } from "./errors"
import type { CastVoteArgs, RoomRoundArgs, VoteProgressArgs, SkipVoteArgs } from "./types"

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

  return playersInRoom.filter(player => player.isConnected && !player.isEliminated)
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

  if (!voter || voter.roomId !== roomId || !voter.isConnected || voter.isEliminated) {
    throw new Error(GAME_ERROR.VOTER_NOT_IN_ROOM)
  }

  const target = await ctx.db.get(targetPlayerId)

  if (!target || target.roomId !== roomId || !target.isConnected || target.isEliminated) {
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

export async function getVoteProgressHandler(ctx: QueryCtx, { roomId, roundId, voterPlayerId }: VoteProgressArgs) {
  const room = await ctx.db.get(roomId)
  if (!room || room.status !== GAME_STATUS.VOTING || room.currentRoundId !== roundId) {
    return null
  }
  const round = await ctx.db.get(roundId)
  const activePlayers = await getActivePlayersByRoom(ctx, roomId)
  const activePlayerIds = new Set(activePlayers.map(player => player._id))
  const votes = await getVotesByRoomRound(ctx, { roomId, roundId })

  const activeVotes = votes.filter(
    (vote) =>
      activePlayerIds.has(vote.voterPlayerId) &&
      (vote.targetPlayerId === undefined || activePlayerIds.has(vote.targetPlayerId)),
  )

  const selectedVote = voterPlayerId
    ? votes.find((vote) => vote.voterPlayerId === voterPlayerId)
    : undefined

  const selectedTargetPlayerId =
    selectedVote &&
      activePlayerIds.has(selectedVote.voterPlayerId) &&
      !!selectedVote.targetPlayerId &&
      activePlayerIds.has(selectedVote.targetPlayerId)
      ? selectedVote.targetPlayerId
      : null

  const hasVoted = voterPlayerId
    ? votes.some((vote) => vote.voterPlayerId === voterPlayerId)
    : false

  return {
    votedCount: activeVotes.length,
    eligibleVoterCount: activePlayers.length,
    isComplete: activeVotes.length === activePlayers.length,
    selectedTargetPlayerId,
    votingEndsAt: round?.votingEndsAt ?? null,
    hasVoted
  }

}

function buildVoteCounts(
  votes: Awaited<ReturnType<typeof getVotesByRoomRound>>,
  activePlayerIds: Set<string>,
  activePlayers: { _id: string }[],
) {
  const voteCounts = new Map(activePlayers.map((p) => [p._id, 0]))
  for (const vote of votes) {
    if (!activePlayerIds.has(vote.voterPlayerId) || !vote.targetPlayerId || !activePlayerIds.has(vote.targetPlayerId)) continue
    voteCounts.set(vote.targetPlayerId, (voteCounts.get(vote.targetPlayerId) ?? 0) + 1)
  }
  return voteCounts
}

export async function getVotingResultsHandler(ctx: QueryCtx, { roomId, roundId }: RoomRoundArgs) {
  await getCurrentVotingRound(ctx, { roomId, roundId })
  const activePlayers = await getActivePlayersByRoom(ctx, roomId)
  const activePlayerIds = new Set(activePlayers.map(player => player._id))
  const votes = await getVotesByRoomRound(ctx, { roomId, roundId })
  const voteCounts = buildVoteCounts(votes, activePlayerIds, activePlayers)

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

export async function finalizeVotingHandler(ctx: MutationCtx, { roomId, roundId }: RoomRoundArgs) {
  const room = await ctx.db.get(roomId)
  if (!room) throw new Error(GAME_ERROR.ROOM_NOT_FOUND)

  if (room.status !== GAME_STATUS.VOTING) {
    return
  }

  await getCurrentVotingRound(ctx, { roomId, roundId })

  const activePlayers = await getActivePlayersByRoom(ctx, roomId)
  const activePlayerIds = new Set(activePlayers.map((p) => p._id))
  const votes = await getVotesByRoomRound(ctx, { roomId, roundId })

  const activeVotes = votes.filter(
    (vote) =>
      activePlayerIds.has(vote.voterPlayerId) &&
      !!vote.targetPlayerId &&
      activePlayerIds.has(vote.targetPlayerId),
  )

  const abstentions = votes.filter(
    (vote) => activePlayerIds.has(vote.voterPlayerId) && vote.targetPlayerId === undefined,
  )

  if (activeVotes.length === 0 || abstentions.length > activeVotes.length) {
    await Promise.all([
      ctx.db.patch(roundId, { eliminatedPlayerId: undefined, isTie: false, isGameOver: false, hadElimination: false }),
      ctx.db.patch(roomId, { status: GAME_STATUS.RESULTS })
    ])
    return { isTie: false as const, eliminatedPlayerId: undefined, didSpyWon: undefined }
  }
  const voteCounts = buildVoteCounts(activeVotes, activePlayerIds, activePlayers)

  const topCount = Math.max(0, ...voteCounts.values())
  const topCandidates = activePlayers.filter((p) => voteCounts.get(p._id) === topCount)
  const isTie = topCandidates.length > 1

  const startedAt = Date.now()
  if (isTie) {
    await ctx.db.patch(roundId, {
      isTie: true,
      tieCandidateIds: topCandidates.map((p) => p._id),
      battleEndsAt: startedAt + BATTLE_REVEAL_DURATION_MS
    })
    await ctx.db.patch(roomId, { status: GAME_STATUS.BATTLE })
    return { isTie: true as const, eliminatedPlayerId: undefined, didSpyWon: undefined }
  }

  const eliminatedPlayer = topCandidates[0]
  await ctx.db.patch(eliminatedPlayer._id, { isEliminated: true })

  const roleAssignment = await ctx.db
    .query(TABLE.ROLE_ASSIGNMENTS)
    .withIndex(INDEX.ROLE_ASSIGNMENTS_BY_ROUND_ID_PLAYER_ID, (q) =>
      q.eq('roundId', roundId).eq('playerId', eliminatedPlayer._id))
    .unique()

  const eliminatedIsSpy = roleAssignment?.role === 'spy'

  const spyAssignments = (await ctx.db
    .query(TABLE.ROLE_ASSIGNMENTS)
    .withIndex(INDEX.ROLE_ASSIGNMENTS_BY_ROUND_ID, (q) => q.eq('roundId', roundId))
    .collect())
    .filter((a) => a.role === 'spy')

  const remainingSpies = spyAssignments.length - (eliminatedIsSpy ? 1 : 0)
  const remainingPlayers = activePlayers.length - 1
  const remainingCivilians = remainingPlayers - remainingSpies

  let didSpyWon: boolean
  let gameOver: boolean

  if (remainingSpies === 0) {
    didSpyWon = false
    gameOver = true
  } else if (remainingSpies >= remainingCivilians) {
    didSpyWon = true
    gameOver = true
  } else {
    didSpyWon = false
    gameOver = false
  }

  await ctx.db.patch(roundId, { eliminatedPlayerId: eliminatedPlayer._id, didSpyWon, isTie: false, isGameOver: gameOver, hadElimination: true })
  await ctx.db.patch(roomId, { status: GAME_STATUS.RESULTS })

  return { isTie: false as const, eliminatedPlayerId: eliminatedPlayer._id, didSpyWon }
}

export async function advanceVotingIfExpiredHandler(ctx: MutationCtx, { roomId, roundId }: RoomRoundArgs) {
  const room = await ctx.db.get(roomId)
  if (!room) throw new Error(GAME_ERROR.ROOM_NOT_FOUND)

  if (room.status !== GAME_STATUS.VOTING) {
    return { advanced: false }
  }

  if (room.currentRoundId !== roundId) {
    throw new Error(GAME_ERROR.NOT_CURRENT_ROOM_ROUND)
  }

  const round = await ctx.db.get(roundId)
  if (!round || round.roomId !== roomId) throw new Error(GAME_ERROR.ROUND_NOT_FOUND)

  if (!round.votingEndsAt || Date.now() < round.votingEndsAt) {
    return { advanced: false }
  }

  const activePlayers = await getActivePlayersByRoom(ctx, roomId)
  const votes = await getVotesByRoomRound(ctx, { roomId, roundId })
  const voterIds = new Set(votes.map((v) => v.voterPlayerId))
  const now = Date.now()

  for (const player of activePlayers) {
    if (!voterIds.has(player._id)) {
      await ctx.db.insert(TABLE.VOTES, {
        roomId,
        roundId,
        voterPlayerId: player._id,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  await finalizeVotingHandler(ctx, { roomId, roundId })

  return { advanced: true }
}

export async function getBattleStateHandler(ctx: QueryCtx, { roomId, roundId }: RoomRoundArgs) {
  const room = await ctx.db.get(roomId)
  if (!room || room.status !== GAME_STATUS.BATTLE || room.currentRoundId !== roundId) {
    return null
  }
  const round = await ctx.db.get(roundId)
  if (!round || !round.tieCandidateIds) return null

  const tiedPlayers = (
    await Promise.all(round.tieCandidateIds.map((id) => ctx.db.get(id)))
  ).filter((p): p is NonNullable<typeof p> => p !== null)

  return {
    tiedPlayers,
    battleEndsAt: round.battleEndsAt ?? null,
  }
}

export async function skipVoteHandler(ctx: MutationCtx, { voterPlayerId, roomId, roundId }: SkipVoteArgs) {
  await getCurrentVotingRound(ctx, { roomId, roundId })

  const voter = await ctx.db.get(voterPlayerId)
  if (!voter || voter.roomId !== roomId || !voter.isConnected || voter.isEliminated) {
    throw new Error(GAME_ERROR.VOTER_NOT_IN_ROOM)
  }

  const existingVote = await ctx.db
    .query(TABLE.VOTES)
    .withIndex(INDEX.VOTES_BY_ROUND_ID_VOTER_PLAYER_ID, (q) =>
      q.eq('roundId', roundId).eq('voterPlayerId', voterPlayerId))
    .unique()
  const now = Date.now()
  if (existingVote) {
    await ctx.db.patch(existingVote._id, { targetPlayerId: undefined, updatedAt: now })
    return { vote: existingVote._id, isUpdated: true }
  }

  const voteId = await ctx.db.insert(TABLE.VOTES, {
    roomId,
    roundId,
    voterPlayerId,
    createdAt: now,
    updatedAt: now,
  })

  return { vote: voteId, isUpdated: false }
}

export async function advanceBattleIfExpiredHandler(ctx: MutationCtx, { roomId, roundId }: RoomRoundArgs) {
  const room = await ctx.db.get(roomId)
  if (!room) throw new Error(GAME_ERROR.ROOM_NOT_FOUND)

  if (room.status !== GAME_STATUS.BATTLE) {
    return { advanced: false }
  }

  if (room.currentRoundId !== roundId) {
    throw new Error(GAME_ERROR.NOT_CURRENT_ROOM_ROUND)
  }

  const round = await ctx.db.get(roundId)
  if (!round || round.roomId !== roomId) throw new Error(GAME_ERROR.ROUND_NOT_FOUND)

  if (!round.battleEndsAt || Date.now() < round.battleEndsAt) {
    return { advanced: false }
  }

  const durationMs = room.discussionTurnDurationMs ?? DISCUSSION_TURN_DURATION_MS
  const turnStartedAt = Date.now()

  await Promise.all([
    ctx.db.patch(roundId, {
      discussionOrder: round.tieCandidateIds,
      currentTurnIndex: 0,
      turnStartedAt,
      turnEndsAt: turnStartedAt + durationMs,
    }),
    ctx.db.patch(roomId, { status: GAME_STATUS.DISCUSSION })
  ])

  return { advanced: true }
}