import { defineTable } from 'convex/server'
import { v } from 'convex/values'
import { INDEX, TABLE } from '../lib/db'

export const rounds = defineTable({
  roomId: v.id(TABLE.ROOMS),
  mode: v.literal('similar_words'),
  civilianWord: v.string(),
  spyWord: v.string(),
  spyCount: v.number(),
  roundNumber: v.number(),
  startedAt: v.number(),
  revealEndsAt: v.optional(v.number()),
  discussionOrder: v.optional(v.array(v.id(TABLE.PLAYERS))),
  currentTurnIndex: v.optional(v.number()),
  turnStartedAt: v.optional(v.number()),
  turnEndsAt: v.optional(v.number()),
}).index(INDEX.ROUNDS_BY_ROOM_ID, ['roomId'])
