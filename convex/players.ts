import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const joinRoom = mutation({
  args: {
    roomCode: v.string(),
    playerName: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.roomCode))
      .unique();

    if (!room) {
      throw new Error("Room not found");
    }

    const playerId = await ctx.db.insert("players", {
      roomId: room._id,
      name: args.playerName,
      isHost: false,
      isConnected: true,
      joinedAt: Date.now(),
    })

    return {
      playerId,
      roomId: room._id,
      roomCode: room?.code,
    }
  }
})

export const getPlayersInRoom = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .collect();
  }
})
