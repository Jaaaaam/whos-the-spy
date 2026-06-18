import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GAME_STATUS } from '../../../shared/gameStatus'
import { GAME_ERROR } from '../../game/errors'
import { advanceBattleIfExpiredHandler } from '../../game/voting'
import {
  createBattleRound,
  createCtx,
  createPlayer,
  createRoomWithStatus,
  createVote,
  playerId,
  roomId,
  roundId,
  type StoredTables,
  voteId,
} from '../gameTestUtils'

describe('advanceBattleIfExpiredHandler', () => {
  const currentRoomId = roomId('room_1')
  const currentRoundId = roundId('round_1')
  const player1 = playerId('player_1')
  const player2 = playerId('player_2')
  const player3 = playerId('player_3')

  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  function baseTables(overrides: Partial<StoredTables> = {}): StoredTables {
    return {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.BATTLE, currentRoundId)],
      players: [
        createPlayer(player1, currentRoomId),
        createPlayer(player2, currentRoomId),
        createPlayer(player3, currentRoomId),
      ],
      rounds: [createBattleRound(currentRoundId, currentRoomId, {
        tieCandidateIds: [player1, player2],
        battleEndsAt: 60_000,
      })],
      roleAssignments: [],
      votes: [],
      ...overrides,
    }
  }

  it('no-ops when timer has not expired', async () => {
    vi.setSystemTime(30_000)
    const tables = baseTables()
    const result = await advanceBattleIfExpiredHandler(createCtx(tables), { roomId: currentRoomId, roundId: currentRoundId })
    expect(result).toEqual({ advanced: false })
    expect(tables.rooms[0].status).toBe(GAME_STATUS.BATTLE)
  })

  it('no-ops when room is not in battle phase', async () => {
    vi.setSystemTime(90_000)
    const tables = baseTables({
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.DISCUSSION, currentRoundId)],
    })
    const result = await advanceBattleIfExpiredHandler(createCtx(tables), { roomId: currentRoomId, roundId: currentRoundId })
    expect(result).toEqual({ advanced: false })
    expect(tables.rooms[0].status).toBe(GAME_STATUS.DISCUSSION)
  })

  it('transitions to discussion with only tie candidates when timer expires', async () => {
    vi.setSystemTime(90_000)
    const tables = baseTables()
    const result = await advanceBattleIfExpiredHandler(createCtx(tables), { roomId: currentRoomId, roundId: currentRoundId })
    expect(result).toEqual({ advanced: true })
    expect(tables.rooms[0].status).toBe(GAME_STATUS.DISCUSSION)
    expect(tables.rounds[0].discussionOrder).toEqual([player1, player2])
    expect(tables.rounds[0].currentTurnIndex).toBe(0)
    expect(tables.rounds[0].turnStartedAt).toEqual(expect.any(Number))
    expect(tables.rounds[0].turnEndsAt).toEqual(expect.any(Number))
  })

  it('clears all existing votes so tiebreaker voting starts with a clean slate', async () => {
    vi.setSystemTime(90_000)
    const tables = baseTables({
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, player1, player2),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, player2, player1),
        createVote(voteId('vote_3'), currentRoomId, currentRoundId, player3, player1),
      ],
    })
    await advanceBattleIfExpiredHandler(createCtx(tables), { roomId: currentRoomId, roundId: currentRoundId })
    expect(tables.votes).toHaveLength(0)
  })

  it('does not advance when battleEndsAt is not set', async () => {
    vi.setSystemTime(90_000)
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.BATTLE, currentRoundId)],
      players: [createPlayer(player1, currentRoomId), createPlayer(player2, currentRoomId)],
      rounds: [{ ...createBattleRound(currentRoundId, currentRoomId, { tieCandidateIds: [player1, player2], battleEndsAt: 60_000 }), battleEndsAt: undefined }],
      roleAssignments: [],
      votes: [],
    }
    const result = await advanceBattleIfExpiredHandler(createCtx(tables), { roomId: currentRoomId, roundId: currentRoundId })
    expect(result).toEqual({ advanced: false })
  })

  it('throws when the round is not the current room round', async () => {
    vi.setSystemTime(90_000)
    const otherRoundId = roundId('round_2')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.BATTLE, currentRoundId)],
      players: [createPlayer(player1, currentRoomId), createPlayer(player2, currentRoomId)],
      rounds: [createBattleRound(otherRoundId, currentRoomId, { tieCandidateIds: [player1, player2], battleEndsAt: 60_000 })],
      roleAssignments: [],
      votes: [],
    }
    await expect(
      advanceBattleIfExpiredHandler(createCtx(tables), { roomId: currentRoomId, roundId: otherRoundId })
    ).rejects.toThrow(GAME_ERROR.NOT_CURRENT_ROOM_ROUND)
  })
})
