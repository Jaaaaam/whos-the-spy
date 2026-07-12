import { describe, expect, it } from 'vitest'
import { GAME_ERROR } from '../../game/errors'
import { playAgainHandler } from '../../game/playAgain'
import {
  categorySuggestionId,
  categoryVoteId,
  createCategorySuggestion,
  createCategoryVote,
  createCtx,
  createPlayer,
  createRoom,
  createRoleAssignment,
  createRoomWithStatus,
  createRound,
  createVote,
  createWordlessRound,
  createWordSubmission,
  playerId,
  roleAssignmentId,
  roomId,
  roundId,
  voteId,
  wordSubmissionId,
} from '../gameTestUtils'
import { GAME_STATUS } from '../../../shared/gameStatus'
import type { StoredTables } from '../gameTestUtils'

describe('playAgainHandler', () => {
  it('resets room to LOBBY, clears currentRoundId, un-eliminates players, and deletes rounds/roleAssignments/votes', async () => {
    const currentRoomId = roomId('room_1')
    const hostId = playerId('player_1')
    const eliminatedId = playerId('player_2')
    const round1Id = roundId('round_1')
    const tables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.RESULTS, round1Id)],
      players: [
        createPlayer(hostId, currentRoomId, true),
        { ...createPlayer(eliminatedId, currentRoomId), isEliminated: true },
      ],
      rounds: [createRound(round1Id, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, round1Id, hostId, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, round1Id, eliminatedId, 'civilian'),
      ],
      votes: [
        createVote(voteId('vote_1'), currentRoomId, round1Id, hostId, eliminatedId),
      ],
    }
    const ctx = createCtx(tables)

    await playAgainHandler(ctx, { roomId: currentRoomId, hostPlayerId: hostId })

    expect(tables.rooms[0].status).toBe(GAME_STATUS.LOBBY)
    expect(tables.rooms[0].currentRoundId).toBeUndefined()
    expect(tables.rounds).toHaveLength(0)
    expect(tables.roleAssignments).toHaveLength(0)
    expect(tables.votes).toHaveLength(0)
    expect(tables.players.find((p) => p._id === eliminatedId)?.isEliminated).toBe(false)
  })

  it('throws ROOM_NOT_FOUND when room does not exist', async () => {
    const tables = {
      rooms: [],
      players: [],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await expect(
      playAgainHandler(ctx, { roomId: roomId('ghost'), hostPlayerId: playerId('player_1') }),
    ).rejects.toThrow(GAME_ERROR.ROOM_NOT_FOUND)
  })

  it('throws INVALID_STATUS when room is not in RESULTS', async () => {
    const currentRoomId = roomId('room_1')
    const hostId = playerId('player_1')
    const tables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.LOBBY)],
      players: [createPlayer(hostId, currentRoomId, true)],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await expect(
      playAgainHandler(ctx, { roomId: currentRoomId, hostPlayerId: hostId }),
    ).rejects.toThrow(GAME_ERROR.INVALID_STATUS)
  })

  it('throws NOT_HOST when caller is not the host', async () => {
    const currentRoomId = roomId('room_1')
    const hostId = playerId('player_1')
    const guestId = playerId('player_2')
    const round1Id = roundId('round_1')
    const tables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.RESULTS, round1Id)],
      players: [
        createPlayer(hostId, currentRoomId, true),
        createPlayer(guestId, currentRoomId),
      ],
      rounds: [createRound(round1Id, currentRoomId)],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await expect(
      playAgainHandler(ctx, { roomId: currentRoomId, hostPlayerId: guestId }),
    ).rejects.toThrow(GAME_ERROR.NOT_HOST)
  })

  it('does not patch players who are not eliminated', async () => {
    const currentRoomId = roomId('room_1')
    const hostId = playerId('player_1')
    const round1Id = roundId('round_1')
    const tables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.RESULTS, round1Id)],
      players: [
        createPlayer(hostId, currentRoomId, true),
        createPlayer(playerId('player_2'), currentRoomId),
      ],
      rounds: [createRound(round1Id, currentRoomId)],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await playAgainHandler(ctx, { roomId: currentRoomId, hostPlayerId: hostId })

    expect(tables.players.every((p) => !p.isEliminated)).toBe(true)
  })

  it('deletes wordless phase rows when resetting the room', async () => {
    const currentRoomId = roomId('room_1')
    const hostId = playerId('player_1')
    const firstRoundId = roundId('round_1')
    const tables: StoredTables = {
      rooms: [{
        ...createRoomWithStatus(currentRoomId, GAME_STATUS.RESULTS, firstRoundId),
        mode: 'wordless_spy',
      }],
      players: [
        createPlayer(hostId, currentRoomId, true),
        createPlayer(playerId('player_2'), currentRoomId),
        createPlayer(playerId('player_3'), currentRoomId),
      ],
      rounds: [createWordlessRound(firstRoundId, currentRoomId, { category: 'Animals', civilianWord: 'Lion', isGameOver: true })],
      roleAssignments: [],
      categorySuggestions: [
        createCategorySuggestion(categorySuggestionId('cs_1'), currentRoomId, firstRoundId, hostId, 'Animals'),
      ],
      categoryVotes: [
        createCategoryVote(categoryVoteId('cv_1'), currentRoomId, firstRoundId, playerId('player_2'), categorySuggestionId('cs_1')),
      ],
      wordSubmissions: [
        createWordSubmission(wordSubmissionId('ws_1'), currentRoomId, firstRoundId, hostId, 'Lion'),
      ],
    }
    const ctx = createCtx(tables)

    await playAgainHandler(ctx, { roomId: currentRoomId, hostPlayerId: hostId })

    expect(tables.categorySuggestions).toHaveLength(0)
    expect(tables.categoryVotes).toHaveLength(0)
    expect(tables.wordSubmissions).toHaveLength(0)
    expect(tables.rounds).toHaveLength(0)
    expect(tables.rooms[0].status).toBe(GAME_STATUS.LOBBY)
  })
})
