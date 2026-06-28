import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { MAX_PLAYERS_PER_ROOM } from "../shared/gameSettings";
import { INDEX, TABLE } from "./lib/db";
import { GAME_ERROR } from "./game/errors";
import { HEARTBEAT_INTERVAL_MS } from "./game/constants";

type JoinRoomArgs = {
  roomCode: string
  playerName: string
  currentPlayerId?: Id<typeof TABLE.PLAYERS>
}

type PlayerRoomArgs = {
  roomId: Id<typeof TABLE.ROOMS>
  playerId: Id<typeof TABLE.PLAYERS>
}

type SetPlayerConnectionArgs = PlayerRoomArgs & {
  isConnected: boolean
}


async function getPlayersByRoomId(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<typeof TABLE.ROOMS>,
) {
  return await ctx.db
    .query(TABLE.PLAYERS)
    .withIndex(INDEX.PLAYERS_BY_ROOM_ID, (q) => q.eq('roomId', roomId))
    .collect();
}

export async function joinRoomHandler(ctx: MutationCtx, args: JoinRoomArgs) {
  const room = await ctx.db
    .query(TABLE.ROOMS)
    .withIndex(INDEX.ROOMS_BY_CODE, (q) => q.eq("code", args.roomCode))
    .unique();

  if (!room) {
    throw new Error("Room not found");
  }

  const existingPlayers = await getPlayersByRoomId(ctx, room._id);
  const currentPlayer = args.currentPlayerId
    ? existingPlayers.find(player => player._id === args.currentPlayerId)
    : null;

  if (currentPlayer) {
    await ctx.db.patch(currentPlayer._id, {
      isConnected: true,
      lastSeenAt: Date.now(),
    })

    return {
      playerId: currentPlayer._id,
      roomId: room._id,
      roomCode: room.code,
      rejoined: true,
    }
  }

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
    name: normalizedPlayerName,
    isHost: false,
    isConnected: true,
    joinedAt: Date.now(),
    lastSeenAt: Date.now()
  })

  return {
    playerId,
    roomId: room._id,
    roomCode: room?.code,
    rejoined: false,
  }
}

export async function setPlayerConnectionHandler(
  ctx: MutationCtx,
  args: SetPlayerConnectionArgs,
) {
  const player = await ctx.db.get(args.playerId);

  if (!player || player.roomId !== args.roomId) {
    throw new Error("Player not found in this room");
  }

  await ctx.db.patch(player._id, {
    isConnected: args.isConnected,
  })

  return {
    playerId: player._id,
    isConnected: args.isConnected,
  }
}

export async function setHeartbeatHandler(ctx: MutationCtx, { playerId, roomId }: PlayerRoomArgs) {
  const player = await ctx.db.get(playerId);
  if (!player || player.roomId !== roomId) {
    throw new Error(GAME_ERROR.PLAYER_NOT_IN_ROOM)
  }
  await ctx.db.patch(playerId, {
    lastSeenAt: Date.now()
  })
}

export async function markDisconnectedPlayersHandler(ctx: MutationCtx) {
  const threshold = Date.now() - HEARTBEAT_INTERVAL_MS

  const stalePlayers = await ctx.db
    .query(TABLE.PLAYERS)
    .filter(q =>
      q.and(
        q.eq(q.field('isConnected'), true),
        q.lt(q.field('lastSeenAt'), threshold)
      )
    ).collect()

  await Promise.all(stalePlayers.map(p => ctx.db.patch(p._id, { isConnected: false })));
}
export const joinRoom = mutation({
  args: {
    roomCode: v.string(),
    playerName: v.string(),
    currentPlayerId: v.optional(v.id(TABLE.PLAYERS)),
  },
  handler: joinRoomHandler,
})

export const setPlayerConnection = mutation({
  args: {
    roomId: v.id(TABLE.ROOMS),
    playerId: v.id(TABLE.PLAYERS),
    isConnected: v.boolean(),
  },
  handler: setPlayerConnectionHandler,
})

export const getPlayersInRoom = query({
  args: {
    roomId: v.id(TABLE.ROOMS),
  },
  handler: async (ctx, args) => {
    return getPlayersByRoomId(ctx, args.roomId);
  }
})

export const heartBeat = mutation({
  args: {
    playerId: v.id(TABLE.PLAYERS),
    roomId: v.id(TABLE.ROOMS)
  },
  handler: setHeartbeatHandler
})

export const markDisconnectedPlayers = internalMutation({
  args: {},
  handler: markDisconnectedPlayersHandler
})