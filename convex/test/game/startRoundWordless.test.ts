import { describe, expect, it } from 'vitest'
import { GAME_STATUS } from '../../../shared/gameStatus'
import { startRoundHandler } from '../../game/startRound'
import {
  createCtx,
  createPlayer,
  createRoleAssignment,
  createRoom,
  createRoomWithStatus,
  createWordlessRound,
  playerId,
  roleAssignmentId,
  roomId,
  roundId,
  type StoredTables,
} from '../gameTestUtils'

const currentRoomId = roomId('room_1')
const hostPlayerId = playerId('player_1')

function playersInRoom() {
  return [
    createPlayer(hostPlayerId, currentRoomId, true),
    createPlayer(playerId('player_2'), currentRoomId),
    createPlayer(playerId('player_3'), currentRoomId),
    createPlayer(playerId('player_4'), currentRoomId),
  ]
}

describe('startRoundHandler (wordless_spy)', () => {
  it('creates a wordless round without words and moves the room to category suggestion', async () => {
    const tables: StoredTables = {
      rooms: [{ ...createRoom(currentRoomId), mode: 'wordless_spy' }],
      players: playersInRoom(),
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const result = await startRoundHandler(ctx, {
      roomId: currentRoomId,
      hostPlayerId,
      spyCount: 1,
    })

    expect(tables.rounds).toHaveLength(1)
    expect(tables.rounds[0]).toMatchObject({
      _id: result.roundId,
      mode: 'wordless_spy',
      roundNumber: 1,
      suggestionEndsAt: expect.any(Number),
    })
    expect(tables.rounds[0].civilianWord).toBeUndefined()
    expect(tables.rounds[0].spyWord).toBeUndefined()
    expect(tables.rounds[0].category).toBeUndefined()
    expect(tables.rounds[0].revealEndsAt).toBeUndefined()
    expect(tables.roleAssignments).toHaveLength(4)
    expect(tables.roleAssignments.filter(({ role }) => role === 'spy')).toHaveLength(1)
    expect(tables.rooms[0].status).toBe(GAME_STATUS.CATEGORY_SUGGESTION)
    expect(tables.rooms[0].currentRoundId).toBe(result.roundId)
  })

  it('carries category, word, and roles into a follow-up round and skips the phases', async () => {
    const firstRoundId = roundId('round_1')
    const tables: StoredTables = {
      rooms: [{
        ...createRoomWithStatus(currentRoomId, GAME_STATUS.RESULTS, firstRoundId),
        mode: 'wordless_spy',
      }],
      players: playersInRoom(),
      rounds: [createWordlessRound(firstRoundId, currentRoomId, {
        category: 'Animals',
        civilianWord: 'Lion',
        isGameOver: false,
        hadElimination: true,
      })],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, firstRoundId, hostPlayerId, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, firstRoundId, playerId('player_2'), 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_3'), currentRoomId, firstRoundId, playerId('player_3'), 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_4'), currentRoomId, firstRoundId, playerId('player_4'), 'civilian'),
      ],
    }
    const ctx = createCtx(tables)

    const result = await startRoundHandler(ctx, {
      roomId: currentRoomId,
      hostPlayerId,
    })

    const newRound = tables.rounds.find((round) => round._id === result.roundId)!
    expect(newRound.mode).toBe('wordless_spy')
    expect(newRound.category).toBe('Animals')
    expect(newRound.civilianWord).toBe('Lion')
    expect(newRound.suggestionEndsAt).toBeUndefined()
    expect(tables.rooms[0].status).toBe(GAME_STATUS.DISCUSSION)
  })
})
