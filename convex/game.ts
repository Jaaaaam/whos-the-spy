import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { TABLE } from "./lib/db"
import {
  advanceDiscussionIfExpiredHandler,
  endDiscussionTurnHandler,
  getDiscussionStateHandler,
} from "./game/discussion"
import {
  advanceRevealIfExpiredHandler,
  getMyRevealHandler,
  getMyRoleHandler,
  getRevealStateHandler,
  markRoleSeenHandler,
} from "./game/reveal"
import { startRoundHandler } from "./game/startRound"
import {
  castVoteHandler,
  finalizeVotingHandler,
  getVoteProgressHandler,
  getVotingResultsHandler,
} from "./game/voting"
import { getResultsStateHandler } from "./game/results"
import { playAgainHandler } from "./game/playAgain"

export const startRound = mutation({
  args: {
    roomId: v.id(TABLE.ROOMS),
    hostPlayerId: v.id(TABLE.PLAYERS),
    spyCount: v.optional(v.number())
  },
  handler: startRoundHandler,
})

export const getRevealState = query({
  args: {
    roundId: v.id(TABLE.ROUNDS),
  },
  handler: getRevealStateHandler,
})

export const getDiscussionState = query({
  args: {
    roomId: v.id(TABLE.ROOMS),
    roundId: v.id(TABLE.ROUNDS),
  },
  handler: getDiscussionStateHandler,
})

export const endDiscussionTurn = mutation({
  args: {
    roomId: v.id(TABLE.ROOMS),
    roundId: v.id(TABLE.ROUNDS),
    playerId: v.id(TABLE.PLAYERS),
  },
  handler: endDiscussionTurnHandler,
})

export const advanceDiscussionIfExpired = mutation({
  args: {
    roomId: v.id(TABLE.ROOMS),
    roundId: v.id(TABLE.ROUNDS),
  },
  handler: advanceDiscussionIfExpiredHandler,
})

export const getMyRole = query({
  args: {
    roundId: v.id(TABLE.ROUNDS),
    playerId: v.id(TABLE.PLAYERS),
  },
  handler: getMyRoleHandler,
})

export const getMyReveal = query({
  args: {
    roundId: v.id(TABLE.ROUNDS),
    playerId: v.id(TABLE.PLAYERS),
  },
  handler: getMyRevealHandler,
})

export const markRoleSeen = mutation({
  args: {
    roundId: v.id(TABLE.ROUNDS),
    playerId: v.id(TABLE.PLAYERS),
  },
  handler: markRoleSeenHandler
})

export const advanceRevealIfExpired = mutation({
  args: {
    roomId: v.id(TABLE.ROOMS),
    roundId: v.id(TABLE.ROUNDS),
  },
  handler: advanceRevealIfExpiredHandler,
})

export const castVote = mutation({
  args: {
    roomId: v.id(TABLE.ROOMS),
    roundId: v.id(TABLE.ROUNDS),
    voterPlayerId: v.id(TABLE.PLAYERS),
    targetPlayerId: v.id(TABLE.PLAYERS),
  },
  handler: castVoteHandler
})

export const getVoteProgress = query({
  args: {
    roomId: v.id(TABLE.ROOMS),
    roundId: v.id(TABLE.ROUNDS),
    voterPlayerId: v.optional(v.id(TABLE.PLAYERS)),
  },
  handler: getVoteProgressHandler,
})

export const getVotingResults = query({
  args: {
    roomId: v.id(TABLE.ROOMS),
    roundId: v.id(TABLE.ROUNDS),
  },
  handler: getVotingResultsHandler,
})

export const finalizeVoting = mutation({
  args: {
    roomId: v.id(TABLE.ROOMS),
    roundId: v.id(TABLE.ROUNDS),
  },
  handler: finalizeVotingHandler,
})

export const getResultsState = query({
  args: {
    roomId: v.id(TABLE.ROOMS),
    roundId: v.id(TABLE.ROUNDS),
  },
  handler: getResultsStateHandler,
})

export const playAgain = mutation({
  args: {
    roomId: v.id(TABLE.ROOMS),
    hostPlayerId: v.id(TABLE.PLAYERS)
  },
  handler: playAgainHandler
})
