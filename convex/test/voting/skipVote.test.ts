import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GAME_STATUS } from '../../../shared/gameStatus'
import { skipVoteHandler } from '../../game/voting'
import { GAME_ERROR } from '../../game/errors'
import {
  createCtx,
  createPlayer,
  createRoomWithStatus,
  createRound,
  createVote,
  playerId,
  roomId,
  roundId,
  type StoredTables,
  voteId,
} from '../gameTestUtils'

describe('skipVoteHandler', () => {
  const currentRoomId = roomId('room_1')
  const currentRoundId = roundId('round_1')
  const voterId = playerId('player_1')
  const targetId = playerId('player_2')

  function baseTables(overrides: Partial<StoredTables> = {}): StoredTables {
    return {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        createPlayer(voterId, currentRoomId, true),
        createPlayer(targetId, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [],
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates a skip vote with no targetPlayerId', async () => {
    const tables = baseTables()
    const ctx = createCtx(tables)

    const result = await skipVoteHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: voterId,
    })

    expect(result).toEqual({ vote: voteId('vote_1'), isUpdated: false })
    expect(tables.votes).toHaveLength(1)
    expect(tables.votes?.[0]).toMatchObject({
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: voterId,
      createdAt: 1_000,
      updatedAt: 1_000,
    })
    expect(tables.votes?.[0]).not.toHaveProperty('targetPlayerId')
  })

  it('clears targetPlayerId when updating an existing vote to a skip', async () => {
    const tables = baseTables({
      votes: [{
        ...createVote(voteId('vote_1'), currentRoomId, currentRoundId, voterId, targetId),
        createdAt: 500,
        updatedAt: 500,
      }],
    })
    const ctx = createCtx(tables)

    const result = await skipVoteHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: voterId,
    })

    expect(result).toEqual({ vote: voteId('vote_1'), isUpdated: true })
    expect(tables.votes).toHaveLength(1)
    expect(tables.votes?.[0]).toMatchObject({ createdAt: 500, updatedAt: 1_000 })
    expect(tables.votes?.[0]?.targetPlayerId).toBeUndefined()
  })

  it('rejects voting outside the voting phase', async () => {
    const tables = baseTables({
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.DISCUSSION, currentRoundId)],
    })
    const ctx = createCtx(tables)

    await expect(
      skipVoteHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId, voterPlayerId: voterId }),
    ).rejects.toThrow(GAME_ERROR.ROOM_NOT_IN_CURRENT_VOTING)
  })

  it('rejects a stale round', async () => {
    const staleRoundId = roundId('round_0')
    const tables = baseTables()
    const ctx = createCtx(tables)

    await expect(
      skipVoteHandler(ctx, { roomId: currentRoomId, roundId: staleRoundId, voterPlayerId: voterId }),
    ).rejects.toThrow(GAME_ERROR.NOT_CURRENT_ROOM_ROUND)
  })

  it('rejects a voter outside the room', async () => {
    const otherRoomId = roomId('room_2')
    const tables = baseTables({
      players: [
        createPlayer(voterId, otherRoomId),
        createPlayer(targetId, currentRoomId),
      ],
    })
    const ctx = createCtx(tables)

    await expect(
      skipVoteHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId, voterPlayerId: voterId }),
    ).rejects.toThrow(GAME_ERROR.VOTER_NOT_IN_ROOM)
  })

  it('rejects a disconnected voter', async () => {
    const tables = baseTables({
      players: [
        { ...createPlayer(voterId, currentRoomId, true), isConnected: false },
        createPlayer(targetId, currentRoomId),
      ],
    })
    const ctx = createCtx(tables)

    await expect(
      skipVoteHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId, voterPlayerId: voterId }),
    ).rejects.toThrow(GAME_ERROR.VOTER_NOT_IN_ROOM)
  })

  it('rejects an eliminated voter', async () => {
    const tables = baseTables({
      players: [
        { ...createPlayer(voterId, currentRoomId, true), isEliminated: true },
        createPlayer(targetId, currentRoomId),
      ],
    })
    const ctx = createCtx(tables)

    await expect(
      skipVoteHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId, voterPlayerId: voterId }),
    ).rejects.toThrow(GAME_ERROR.VOTER_NOT_IN_ROOM)
  })
})
