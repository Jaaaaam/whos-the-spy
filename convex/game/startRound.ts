import type { Doc } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import type { PlayerRoleAssignment } from "../gameRules"
import {
  assignRandomRoles,
  getRecommendedSpyCount,
  isValidPlayerCount,
} from "../gameRules"
import { wordPairs } from "../wordPairs"
import type { WordPair } from "../wordPairs"
import { GAME_MODE } from "../../shared/gameMode"
import { GAME_STATUS } from "../../shared/gameStatus"
import { INDEX, TABLE } from "../lib/db"
import { CATEGORY_SUGGESTION_DURATION_MS, REVEAL_DURATION_MS } from "./constants"
import { GAME_ERROR } from "./errors"
import type { StartRoundArgs } from "./types"
import { startDiscussion } from "./discussion"

function findCurrentGameFirstRound(existingRounds: Doc<typeof TABLE.ROUNDS>[]) {
  let gameStartIdx = existingRounds.length - 1
  while (gameStartIdx > 0 && !existingRounds[gameStartIdx - 1].isGameOver) {
    gameStartIdx--
  }
  return existingRounds[gameStartIdx]
}

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

  const lastRound = existingRounds[existingRounds.length - 1]
  const isNewGame = !existingRounds.length || lastRound?.isGameOver === true

  const mode = currentRoom.mode ?? GAME_MODE.SIMILAR_WORDS
  const isWordlessMode = mode === GAME_MODE.WORDLESS_SPY

  let civilianWord: string | undefined
  let spyWord: string | undefined
  let category: string | undefined

  if (!isWordlessMode) {
    let wordPair: WordPair
    if (isNewGame) {
      const usedCivilianWords = new Set(existingRounds.map(r => r.civilianWord))
      const availablePairs = wordPairs.filter(p => !usedCivilianWords.has(p.civilianWord))
      const pool = availablePairs.length > 0 ? availablePairs : wordPairs
      wordPair = pool[Math.floor(Math.random() * pool.length)]
    } else {
      const currentGameFirstRound = findCurrentGameFirstRound(existingRounds)
      wordPair = { civilianWord: currentGameFirstRound.civilianWord!, spyWord: currentGameFirstRound.spyWord! }
    }
    civilianWord = wordPair.civilianWord
    spyWord = wordPair.spyWord
  } else if (!isNewGame) {
    const currentGameFirstRound = findCurrentGameFirstRound(existingRounds)
    civilianWord = currentGameFirstRound.civilianWord
    category = currentGameFirstRound.category
  }

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

  const doesRoundStartWithPhases = isWordlessMode && isNewGame

  const startedAt = Date.now()
  const roundId = await ctx.db.insert(TABLE.ROUNDS, {
    roomId,
    mode,
    civilianWord,
    spyWord,
    category,
    spyCount: currentSpyCount,
    roundNumber,
    startedAt,
    revealEndsAt: !isWordlessMode && !existingRounds.length ? startedAt + REVEAL_DURATION_MS : undefined,
    suggestionEndsAt: doesRoundStartWithPhases ? startedAt + CATEGORY_SUGGESTION_DURATION_MS : undefined,
    hadElimination: false
  })

  await Promise.all(assignedRoles.map((assignedRole) =>
    ctx.db.insert(TABLE.ROLE_ASSIGNMENTS, {
      roomId,
      roundId,
      playerId: assignedRole.playerId,
      role: assignedRole.role,
    })
  ))

  if (doesRoundStartWithPhases) {
    await ctx.db.patch(roomId, {
      status: GAME_STATUS.CATEGORY_SUGGESTION,
      currentRoundId: roundId,
    })
  } else if (roundNumber === 1) {
    await ctx.db.patch(roomId, {
      status: GAME_STATUS.ROLE_REVEAL,
      currentRoundId: roundId,
    })
  } else {
    await ctx.db.patch(roomId, { currentRoundId: roundId })
    await startDiscussion(ctx, { roomId, roundId })
  }

  return {
    roundId,
    spyCount: currentSpyCount,
    roundNumber
  }
}
