import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
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
    roomId: v.id('rooms'),
    hostPlayerId: v.id('players'),
    spyCount: v.optional(v.number())
  },
  handler: startRoundHandler,
})

export const getRevealState = query({
  args: {
    roundId: v.id('rounds'),
  },
  handler: getRevealStateHandler,
})

export const getDiscussionState = query({
  args: {
    roomId: v.id('rooms'),
    roundId: v.id('rounds'),
  },
  handler: getDiscussionStateHandler,
})

export const endDiscussionTurn = mutation({
  args: {
    roomId: v.id('rooms'),
    roundId: v.id('rounds'),
    playerId: v.id('players'),
  },
  handler: endDiscussionTurnHandler,
})

export const advanceDiscussionIfExpired = mutation({
  args: {
    roomId: v.id('rooms'),
    roundId: v.id('rounds'),
  },
  handler: advanceDiscussionIfExpiredHandler,
})

export const getMyRole = query({
  args: {
    roundId: v.id('rounds'),
    playerId: v.id('players'),
  },
  handler: getMyRoleHandler,
})

export const getMyReveal = query({
  args: {
    roundId: v.id('rounds'),
    playerId: v.id('players'),
  },
  handler: getMyRevealHandler,
})

export const markRoleSeen = mutation({
  args: {
    roundId: v.id('rounds'),
    playerId: v.id('players'),
  },
  handler: markRoleSeenHandler
})

export const advanceRevealIfExpired = mutation({
  args: {
    roomId: v.id('rooms'),
    roundId: v.id('rounds'),
  },
  handler: advanceRevealIfExpiredHandler,
})
