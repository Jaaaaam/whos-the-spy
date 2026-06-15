import { defineTable } from 'convex/server'
import { v } from 'convex/values'
import { INDEX, TABLE } from '../lib/db'

export const votes = defineTable({
  roomId: v.id(TABLE.ROOMS),
  roundId: v.id(TABLE.ROUNDS),
  voterPlayerId: v.id(TABLE.PLAYERS),
  targetPlayerId: v.optional(v.id(TABLE.PLAYERS)),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index(INDEX.VOTES_BY_ROUND_ID, ['roundId'])
  .index(INDEX.VOTES_BY_ROUND_ID_VOTER_PLAYER_ID, ['roundId', 'voterPlayerId'])
  .index(INDEX.VOTES_BY_ROUND_ID_TARGET_PLAYER_ID, ['roundId', 'targetPlayerId'])
  .index(INDEX.VOTES_BY_ROOM_ID_ROUND_ID, ['roomId', 'roundId'])
