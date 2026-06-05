import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { MAX_PLAYERS_PER_ROOM } from "../shared/gameSettings";
import { INDEX, TABLE } from "./lib/db";

async function getPlayersByRoomId
  (ctx: QueryCtx | MutationCtx, roomId: Id<typeof TABLE.ROOMS>) {
  return await ctx.db
    .query(TABLE.PLAYERS)
    .withIndex(INDEX.PLAYERS_BY_ROOM_ID, (q) => q.eq('roomId', roomId))
    .collect();
}

export const joinRoom = mutation({
  args: {
    roomCode: v.string(),
    playerName: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query(TABLE.ROOMS)
      .withIndex(INDEX.ROOMS_BY_CODE, (q) => q.eq("code", args.roomCode))
      .unique();

    if (!room) {
      throw new Error("Room not found");
    }

    const existingPlayers = await getPlayersByRoomId(ctx, room._id);

    const normalizedPlayerName = args.playerName.trim();

    const doesPlayerNameExist = existingPlayers.some(player => player.name === normalizedPlayerName);

    if (doesPlayerNameExist) {
      throw new Error("Player name already taken in this room");
    }

    if (existingPlayers.length >= MAX_PLAYERS_PER_ROOM) {
      throw new Error("Room is full");
    }

    const playerId = await ctx.db.insert(TABLE.PLAYERS, {
      roomId: room._id,
      name: args.playerName,
      isHost: false,
      isConnected: true,
      joinedAt: Date.now(),
    })
    console.log(playerId, room._id, 'join room')

    return {
      playerId,
      roomId: room._id,
      roomCode: room?.code,
    }
  }
})

export const getPlayersInRoom = query({
  args: {
    roomId: v.id(TABLE.ROOMS),
  },
  handler: async (ctx, args) => {
    return getPlayersByRoomId(ctx, args.roomId);
  }
})
