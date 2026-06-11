import type { MutationCtx } from "../_generated/server"
import type { PlayerRoleAssignment } from "../gameRules"
import {
  assignRandomRoles,
  getRecommendedSpyCount,
  isValidPlayerCount,
} from "../gameRules"
import { getRandomWordPair } from "../wordPairs"
import { GAME_STATUS } from "../../shared/gameStatus"
import { INDEX, TABLE } from "../lib/db"
import { REVEAL_DURATION_MS } from "./constants"
import { GAME_ERROR } from "./errors"
import type { StartRoundArgs } from "./types"

export async function startRoundHandler(
  ctx: MutationCtx,
  { roomId, hostPlayerId, spyCount }: StartRoundArgs,
) {
  const currentRoom = await ctx.db.get(roomId)
  if (!currentRoom) {
    throw new Error(GAME_ERROR.ROOM_NOT_FOUND)
  }

  if (currentRoom.status !== GAME_STATUS.LOBBY && currentRoom.status !== GAME_STATUS.RESULTS) {
    return { roundId: currentRoom.currentRoundId!, spyCount: 0, roundNumber: 0 }
  }

  const hostPlayer = await ctx.db.get(hostPlayerId)

  if (!hostPlayer) {
    throw new Error(GAME_ERROR.HOST_PLAYER_NOT_FOUND)
  }

  if (!hostPlayer.isHost) {
    throw new Error(GAME_ERROR.NOT_HOST)
  }

  if (hostPlayer.roomId !== roomId) {
    throw new Error(GAME_ERROR.HOST_NOT_IN_ROOM)
  }

  const roomPlayers = await ctx.db
    .query(TABLE.PLAYERS)
    .withIndex(INDEX.PLAYERS_BY_ROOM_ID, (q) => q.eq('roomId', roomId))
    .collect()

  const connectedPlayers = roomPlayers.filter(player => player.isConnected && !player.isEliminated)

  if (!isValidPlayerCount(connectedPlayers.length)) {
    throw new Error(GAME_ERROR.INVALID_PLAYER_COUNT)
  }

  const roomPlayerIds = connectedPlayers.map(({ _id }) => _id)

  const existingRounds = await ctx.db
    .query(TABLE.ROUNDS)
    .withIndex(INDEX.ROUNDS_BY_ROOM_ID, (q) => q.eq('roomId', roomId))
    .collect()

  const roundNumber = existingRounds.length + 1

  let assignedRoles: PlayerRoleAssignment[]
  let currentSpyCount: number

  if (roundNumber === 1) {
    currentSpyCount = spyCount ?? getRecommendedSpyCount(connectedPlayers.length)
    assignedRoles = assignRandomRoles(roomPlayerIds, currentSpyCount)
  } else {
    const priorAssignments = await ctx.db
      .query(TABLE.ROLE_ASSIGNMENTS)
      .withIndex(INDEX.ROLE_ASSIGNMENTS_BY_ROOM_ID, (q) => q.eq('roomId', roomId))
      .collect()

    const priorRoleByPlayerId = new Map(priorAssignments.map((a) => [a.playerId, a.role]))

    assignedRoles = connectedPlayers.map((player) => ({
      playerId: player._id,
      role: priorRoleByPlayerId.get(player._id) ?? 'civilian',
    }))

    currentSpyCount = assignedRoles.filter((a) => a.role === 'spy').length
  }
  const wordPair = getRandomWordPair()
  const startedAt = Date.now()
  const roundId = await ctx.db.insert(TABLE.ROUNDS, {
    roomId,
    mode: 'similar_words',
    civilianWord: wordPair.civilianWord,
    spyWord: wordPair.spyWord,
    spyCount: currentSpyCount,
    roundNumber,
    startedAt,
    revealEndsAt: startedAt + REVEAL_DURATION_MS
  })

  for (const assignedRole of assignedRoles) {
    await ctx.db.insert(TABLE.ROLE_ASSIGNMENTS, {
      roomId,
      roundId,
      playerId: assignedRole.playerId,
      role: assignedRole.role,
    })
  }

  await ctx.db.patch(roomId, {
    status: GAME_STATUS.ROLE_REVEAL,
    currentRoundId: roundId,
  })

  return {
    roundId,
    spyCount: currentSpyCount,
    roundNumber
  }
}
