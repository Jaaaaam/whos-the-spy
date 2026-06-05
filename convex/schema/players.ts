import { defineTable } from 'convex/server'
import { v } from 'convex/values'
import { INDEX, TABLE } from '../lib/db'

export const players = defineTable({
  roomId: v.id(TABLE.ROOMS),
  name: v.string(),
  isHost: v.boolean(),
  isConnected: v.boolean(),
  joinedAt: v.number(),
}).index(INDEX.PLAYERS_BY_ROOM_ID, ['roomId'])
