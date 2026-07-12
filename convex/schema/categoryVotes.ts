import { defineTable } from 'convex/server'
import { v } from 'convex/values'
import { INDEX, TABLE } from '../lib/db'

export const categoryVotes = defineTable({
  roomId: v.id(TABLE.ROOMS),
  roundId: v.id(TABLE.ROUNDS),
  voterPlayerId: v.id(TABLE.PLAYERS),
  suggestionId: v.id(TABLE.CATEGORY_SUGGESTIONS),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index(INDEX.CATEGORY_VOTES_BY_ROUND_ID, ['roundId'])
  .index(INDEX.CATEGORY_VOTES_BY_ROUND_ID_VOTER_PLAYER_ID, ['roundId', 'voterPlayerId'])
