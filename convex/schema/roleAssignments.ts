import { defineTable } from 'convex/server'
import { v } from 'convex/values'
import { INDEX, TABLE } from '../lib/db'

export const roleAssignments = defineTable({
  roundId: v.id(TABLE.ROUNDS),
  roomId: v.id(TABLE.ROOMS),
  playerId: v.id(TABLE.PLAYERS),
  role: v.union(v.literal('spy'), v.literal('civilian')),
  seenAt: v.optional(v.number()),
})
  .index(INDEX.ROLE_ASSIGNMENTS_BY_ROUND_ID, ['roundId'])
  .index(INDEX.ROLE_ASSIGNMENTS_BY_ROUND_ID_PLAYER_ID, ['roundId', 'playerId'])
  .index(INDEX.ROLE_ASSIGNMENTS_BY_ROOM_ID, ['roomId'])
