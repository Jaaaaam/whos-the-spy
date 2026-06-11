import { describe, expect, it } from 'vitest'
import { GAME_STATUS } from '../../shared/gameStatus'
import { getResultsStateHandler } from '../game/results'
import { GAME_ERROR } from '../game/errors'
import {
  createCtx,
  createPlayer,
  createRoleAssignment,
  createRoomWithStatus,
  createRound,
  createVote,
  playerId,
  roleAssignmentId,
  roomId,
  roundId,
  type StoredTables,
  voteId,
} from './gameTestUtils'

describe('getResultsStateHandler', () => {
  it('returns results when spy was caught', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const spyId = playerId('spy_player')
    const civilian1Id = playerId('civilian_1')
    const civilian2Id = playerId('civilian_2')

    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.RESULTS, currentRoundId)],
      players: [
        { ...createPlayer(spyId, currentRoomId), name: 'Mika' },
        { ...createPlayer(civilian1Id, currentRoomId), name: 'Jam' },
        { ...createPlayer(civilian2Id, currentRoomId), name: 'Dani' },
      ],
      rounds: [{
        ...createRound(currentRoundId, currentRoomId),
        civilianWord: 'Jollibee',
        eliminatedPlayerId: spyId,
        didSpyWon: false,
        isTie: false,
      }],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, currentRoundId, spyId, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, currentRoundId, civilian1Id, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_3'), currentRoomId, currentRoundId, civilian2Id, 'civilian'),
      ],
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, civilian1Id, spyId),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, civilian2Id, spyId),
        createVote(voteId('vote_3'), currentRoomId, currentRoundId, spyId, civilian1Id),
      ],
    }
    const ctx = createCtx(tables)

    const result = await getResultsStateHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId })

    expect(result.civilianWord).toBe('Jollibee')
    expect(result.eliminatedPlayerName).toBe('Mika')
    expect(result.isEliminatedPlayerSpy).toBe(true)
    expect(result.didSpyWin).toBe(false)
    expect(result.votingHistory).toHaveLength(3)
    expect(result.votingHistory).toContainEqual({ voterName: 'Jam', targetName: 'Mika' })
    expect(result.votingHistory).toContainEqual({ voterName: 'Dani', targetName: 'Mika' })
    expect(result.votingHistory).toContainEqual({ voterName: 'Mika', targetName: 'Jam' })
  })

  it('returns results when spy won', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const spyId = playerId('spy_player')
    const civilian1Id = playerId('civilian_1')
    const civilian2Id = playerId('civilian_2')

    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.RESULTS, currentRoundId)],
      players: [
        { ...createPlayer(spyId, currentRoomId), name: 'Alex' },
        { ...createPlayer(civilian1Id, currentRoomId), name: 'Jam' },
        { ...createPlayer(civilian2Id, currentRoomId), name: 'Dani' },
      ],
      rounds: [{
        ...createRound(currentRoundId, currentRoomId),
        civilianWord: 'Jollibee',
        eliminatedPlayerId: civilian1Id,
        didSpyWon: true,
        isTie: false,
      }],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, currentRoundId, spyId, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, currentRoundId, civilian1Id, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_3'), currentRoomId, currentRoundId, civilian2Id, 'civilian'),
      ],
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, spyId, civilian1Id),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, civilian2Id, civilian1Id),
        createVote(voteId('vote_3'), currentRoomId, currentRoundId, civilian1Id, civilian2Id),
      ],
    }
    const ctx = createCtx(tables)

    const result = await getResultsStateHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId })

    expect(result.eliminatedPlayerName).toBe('Jam')
    expect(result.isEliminatedPlayerSpy).toBe(false)
    expect(result.didSpyWin).toBe(true)
  })

  it('throws when room is not in results phase', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')

    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await expect(
      getResultsStateHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId }),
    ).rejects.toThrow(GAME_ERROR.ROOM_NOT_IN_RESULTS)
  })

  it('throws when room is not found', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')

    const tables: StoredTables = {
      rooms: [],
      players: [],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await expect(
      getResultsStateHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId }),
    ).rejects.toThrow(GAME_ERROR.ROOM_NOT_FOUND)
  })

  it('throws when round does not match current room round', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const otherRoundId = roundId('round_2')

    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.RESULTS, otherRoundId)],
      players: [],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await expect(
      getResultsStateHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId }),
    ).rejects.toThrow(GAME_ERROR.NOT_CURRENT_ROOM_ROUND)
  })
})
