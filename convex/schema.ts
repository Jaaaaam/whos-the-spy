import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    status: v.union(
      v.literal("lobby"),
      v.literal("role_reveal"),
      v.literal("discussion"),
      v.literal("voting"),
      v.literal("results")
    ),
    hostPlayerId: v.optional(v.id("players")),
    createdAt: v.number(),
  }).index("by_code", ["code"]),
  players: defineTable({
    roomId: v.id("rooms"),
    name: v.string(),
    isHost: v.boolean(),
    isConnected: v.boolean(),
    joinedAt: v.number(),
  }).index("by_roomId", ["roomId"]),
})