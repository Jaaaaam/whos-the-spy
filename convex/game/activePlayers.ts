import type { Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { INDEX, TABLE } from "../lib/db"

export async function getActivePlayersByRoom(ctx: QueryCtx | MutationCtx, roomId: Id<typeof TABLE.ROOMS>) {
  const playersInRoom = await ctx.db
    .query(TABLE.PLAYERS)
    .withIndex(INDEX.PLAYERS_BY_ROOM_ID, (q) => q.eq('roomId', roomId))
    .collect()

  return playersInRoom.filter(player => player.isConnected && !player.isEliminated)
}
