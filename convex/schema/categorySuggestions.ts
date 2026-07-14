import { defineTable } from 'convex/server'
import { v } from 'convex/values'
import { INDEX, TABLE } from '../lib/db'

export const categorySuggestions = defineTable({
  roomId: v.id(TABLE.ROOMS),
  roundId: v.id(TABLE.ROUNDS),
  playerId: v.id(TABLE.PLAYERS),
  text: v.string(),
  createdAt: v.number(),
})
  .index(INDEX.CATEGORY_SUGGESTIONS_BY_ROUND_ID, ['roundId'])
  .index(INDEX.CATEGORY_SUGGESTIONS_BY_ROUND_ID_PLAYER_ID, ['roundId', 'playerId'])
