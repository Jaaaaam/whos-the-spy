import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { GAME_STATUS } from "../shared/gameStatus";
import { GAME_MODE, type GameMode } from "../shared/gameMode";
import { GAME_ERROR } from "./game/errors";
import { INDEX, TABLE } from "./lib/db";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

type CreateRoomArgs = {
  playerName: string
  discussionTurnDurationMs: number
}

export async function createRoomHandler(ctx: MutationCtx, args: CreateRoomArgs) {
  const roomId = await ctx.db.insert(TABLE.ROOMS, {
    code: generateRoomCode(),
    status: GAME_STATUS.LOBBY,
    createdAt: Date.now(),
    discussionTurnDurationMs: args.discussionTurnDurationMs,
  });

  const playerId = await ctx.db.insert(TABLE.PLAYERS, {
    roomId,
    name: args.playerName.trim(),
    isHost: true,
    isConnected: true,
    joinedAt: Date.now(),
    lastSeenAt: Date.now()
  });

  await ctx.db.patch(roomId, {
    hostPlayerId: playerId,
  })

  const room = await ctx.db.get(roomId);
  return { room, playerId, code: room?.code };
}

export const createRoom = mutation({
  args: {
    playerName: v.string(),
    discussionTurnDurationMs: v.union(v.literal(60_000), v.literal(120_000), v.literal(180_000)),
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

type SetRoomModeArgs = {
  roomId: Id<typeof TABLE.ROOMS>
  hostPlayerId: Id<typeof TABLE.PLAYERS>
  mode: GameMode
}

export async function setRoomModeHandler(ctx: MutationCtx, { roomId, hostPlayerId, mode }: SetRoomModeArgs) {
  const room = await ctx.db.get(roomId)
  if (!room) throw new Error(GAME_ERROR.ROOM_NOT_FOUND)
  if (room.status !== GAME_STATUS.LOBBY) throw new Error(GAME_ERROR.ROOM_NOT_IN_LOBBY)

  const host = await ctx.db.get(hostPlayerId)
  if (!host) throw new Error(GAME_ERROR.HOST_PLAYER_NOT_FOUND)
  if (!host.isHost) throw new Error(GAME_ERROR.NOT_HOST)
  if (host.roomId !== roomId) throw new Error(GAME_ERROR.HOST_NOT_IN_ROOM)

  await ctx.db.patch(roomId, { mode })
  return { mode }
}

export const setRoomMode = mutation({
  args: {
    roomId: v.id(TABLE.ROOMS),
    hostPlayerId: v.id(TABLE.PLAYERS),
    mode: v.union(v.literal(GAME_MODE.SIMILAR_WORDS), v.literal(GAME_MODE.WORDLESS_SPY)),
  },
  handler: setRoomModeHandler,
})
