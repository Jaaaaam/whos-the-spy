import { defineTable } from 'convex/server'
import { v } from 'convex/values'
import { INDEX, TABLE } from '../lib/db'

export const wordSubmissions = defineTable({
  roomId: v.id(TABLE.ROOMS),
  roundId: v.id(TABLE.ROUNDS),
  playerId: v.id(TABLE.PLAYERS),
  word: v.string(),
  createdAt: v.number(),
})
  .index(INDEX.WORD_SUBMISSIONS_BY_ROUND_ID, ['roundId'])
  .index(INDEX.WORD_SUBMISSIONS_BY_ROUND_ID_PLAYER_ID, ['roundId', 'playerId'])
