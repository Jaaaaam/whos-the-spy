import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { GAME_STATUS } from "../shared/gameStatus";
import { INDEX, TABLE } from "./lib/db";
import type { MutationCtx } from "./_generated/server";

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

type CreateRoomArgs = {
  playerName: string
}

export async function createRoomHandler(ctx: MutationCtx, args: CreateRoomArgs) {
  const roomId = await ctx.db.insert(TABLE.ROOMS, {
    code: generateRoomCode(),
    status: GAME_STATUS.LOBBY,
    createdAt: Date.now(),
  });

  const playerId = await ctx.db.insert(TABLE.PLAYERS, {
    roomId,
    name: args.playerName.trim(),
    isHost: true,
    isConnected: true,
    joinedAt: Date.now(),
  });

  await ctx.db.patch(roomId, {
    hostPlayerId: playerId,
  })

  const room = await ctx.db.get(roomId);
  console.log(room, 'room created')
  return { room, playerId, code: room?.code };
}

export const createRoom = mutation({
  args: {
    playerName: v.string(),
  },
  handler: createRoomHandler,
});

export const getRoomByCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query(TABLE.ROOMS)
      .withIndex(INDEX.ROOMS_BY_CODE, (q) => q.eq("code", args.code))
      .unique();
  }
})
