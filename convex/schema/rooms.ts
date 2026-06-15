import { defineTable } from 'convex/server'
import { v } from 'convex/values'
import { GAME_STATUS } from '../../shared/gameStatus'
import { INDEX, TABLE } from '../lib/db'

export const rooms = defineTable({
  code: v.string(),
  status: v.union(
    v.literal(GAME_STATUS.LOBBY),
    v.literal(GAME_STATUS.ROLE_REVEAL),
    v.literal(GAME_STATUS.DISCUSSION),
    v.literal(GAME_STATUS.VOTING),
    v.literal(GAME_STATUS.BATTLE),
    v.literal(GAME_STATUS.RESULTS),
  ),
  hostPlayerId: v.optional(v.id(TABLE.PLAYERS)),
  currentRoundId: v.optional(v.id(TABLE.ROUNDS)),
  discussionTurnDurationMs: v.optional(v.number()),
  votingDurationMs: v.optional(v.number()),
  createdAt: v.number(),
}).index(INDEX.ROOMS_BY_CODE, ['code'])
