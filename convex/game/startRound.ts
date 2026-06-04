import type { MutationCtx } from "../_generated/server"
import {
  assignRandomRoles,
  getRecommendedSpyCount,
  isValidPlayerCount,
} from "../gameRules"
import { getRandomWordPair } from "../wordPairs"
import { GAME_STATUS } from "../../shared/gameStatus"
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
    .query('players')
    .withIndex('by_roomId', (q) => q.eq('roomId', roomId))
    .collect()

  if (!isValidPlayerCount(roomPlayers.length)) {
    throw new Error(GAME_ERROR.INVALID_PLAYER_COUNT)
  }

  const roomPlayerIds = roomPlayers.map(({ _id }) => _id)
  const currentSpyCount = spyCount ?? getRecommendedSpyCount(roomPlayers.length)
  const assignedRoles = assignRandomRoles(roomPlayerIds, currentSpyCount)

  const existingRounds = await ctx.db
    .query('rounds')
    .withIndex('by_roomId', (q) => q.eq('roomId', roomId))
    .collect()

  const roundNumber = existingRounds.length + 1
  const wordPair = getRandomWordPair()
  const startedAt = Date.now()
  const roundId = await ctx.db.insert('rounds', {
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
    await ctx.db.insert('roleAssignments', {
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
