import { defineTable } from 'convex/server'
import { v } from 'convex/values'
import { GAME_MODE } from '../../shared/gameMode'
import { INDEX, TABLE } from '../lib/db'

export const rounds = defineTable({
  roomId: v.id(TABLE.ROOMS),
  mode: v.union(v.literal(GAME_MODE.SIMILAR_WORDS), v.literal(GAME_MODE.WORDLESS_SPY)),
  civilianWord: v.optional(v.string()),
  spyWord: v.optional(v.string()),
  category: v.optional(v.string()),
  suggestionEndsAt: v.optional(v.number()),
  categoryVoteEndsAt: v.optional(v.number()),
  wordSubmissionEndsAt: v.optional(v.number()),
  spyCount: v.number(),
  roundNumber: v.number(),
  startedAt: v.number(),
  revealEndsAt: v.optional(v.number()),
  discussionOrder: v.optional(v.array(v.id(TABLE.PLAYERS))),
  currentTurnIndex: v.optional(v.number()),
  turnStartedAt: v.optional(v.number()),
  turnEndsAt: v.optional(v.number()),
  votingEndsAt: v.optional(v.number()),
  eliminatedPlayerId: v.optional(v.id(TABLE.PLAYERS)),
  tieCandidateIds: v.optional(v.array(v.id(TABLE.PLAYERS))),
  didSpyWon: v.optional(v.boolean()),
  isTie: v.optional(v.boolean()),
  isGameOver: v.optional(v.boolean()),
  hadElimination: v.boolean(),
  battleEndsAt: v.optional(v.number())
}).index(INDEX.ROUNDS_BY_ROOM_ID, ['roomId'])
