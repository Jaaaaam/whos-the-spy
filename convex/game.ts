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
