import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GAME_STATUS } from '../../../shared/gameStatus'
import { castVoteHandler } from '../../game/voting'
import { GAME_ERROR } from '../../game/errors'
import {
  createCtx,
  createPlayer,
  createRoom,
  createRoomWithStatus,
  createRound,
  createVote,
  playerId,
  roomId,
  roundId,
  type StoredTables,
  voteId,
} from '../gameTestUtils'

describe('castVoteHandler', () => {
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

  it('creates a vote during the voting phase', async () => {
    const tables = baseTables()
    const ctx = createCtx(tables)

    const result = await castVoteHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: voterId,
      targetPlayerId: targetId,
    })

    expect(result).toEqual({
      vote: voteId('vote_1'),
      isUpdated: false,
    })
    expect(tables.votes).toHaveLength(1)
    expect(tables.votes?.[0]).toMatchObject({
      _id: voteId('vote_1'),
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: voterId,
      targetPlayerId: targetId,
      createdAt: 1_000,
      updatedAt: 1_000,
    })
  })

  it('updates an existing vote for the same voter and round', async () => {
    const firstTargetId = playerId('player_2')
    const nextTargetId = playerId('player_3')
    const existingVote = {
      ...createVote(voteId('vote_1'), currentRoomId, currentRoundId, voterId, firstTargetId),
      createdAt: 500,
      updatedAt: 500,
    }
    const tables = baseTables({
      players: [
        createPlayer(voterId, currentRoomId, true),
        createPlayer(firstTargetId, currentRoomId),
        createPlayer(nextTargetId, currentRoomId),
      ],
      votes: [existingVote],
    })
    const ctx = createCtx(tables)

    const result = await castVoteHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: voterId,
      targetPlayerId: nextTargetId,
    })

    expect(result).toEqual({
      vote: voteId('vote_1'),
      isUpdated: true,
    })
    expect(tables.votes).toHaveLength(1)
    expect(tables.votes?.[0]).toMatchObject({
      targetPlayerId: nextTargetId,
      createdAt: 500,
      updatedAt: 1_000,
    })
  })

  it('rejects voting outside the voting phase', async () => {
    const tables = baseTables({
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.DISCUSSION, currentRoundId)],
    })
    const ctx = createCtx(tables)

    await expect(
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        voterPlayerId: voterId,
        targetPlayerId: targetId,
      }),
    ).rejects.toThrow(GAME_ERROR.ROOM_NOT_IN_CURRENT_VOTING)
    expect(tables.votes).toHaveLength(0)
  })

  it('rejects voting for a stale round', async () => {
    const staleRoundId = roundId('round_2')
    const tables = baseTables({
      rounds: [
        createRound(currentRoundId, currentRoomId),
        createRound(staleRoundId, currentRoomId),
      ],
    })
    const ctx = createCtx(tables)

    await expect(
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: staleRoundId,
        voterPlayerId: voterId,
        targetPlayerId: targetId,
      }),
    ).rejects.toThrow(GAME_ERROR.NOT_CURRENT_ROOM_ROUND)
  })

  it('rejects a missing round', async () => {
    const tables = baseTables({ rounds: [] })
    const ctx = createCtx(tables)

    await expect(
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        voterPlayerId: voterId,
        targetPlayerId: targetId,
      }),
    ).rejects.toThrow(GAME_ERROR.ROUND_NOT_FOUND)
  })

  it('rejects a voter outside the room', async () => {
    const otherRoomId = roomId('room_2')
    const tables = baseTables({
      rooms: [
        createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId),
        createRoom(otherRoomId),
      ],
      players: [
        createPlayer(voterId, otherRoomId),
        createPlayer(targetId, currentRoomId),
      ],
    })
    const ctx = createCtx(tables)

    await expect(
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        voterPlayerId: voterId,
        targetPlayerId: targetId,
      }),
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
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        voterPlayerId: voterId,
        targetPlayerId: targetId,
      }),
    ).rejects.toThrow(GAME_ERROR.VOTER_NOT_IN_ROOM)
  })

  it('rejects a target outside the room', async () => {
    const otherRoomId = roomId('room_2')
    const tables = baseTables({
      rooms: [
        createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId),
        createRoom(otherRoomId),
      ],
      players: [
        createPlayer(voterId, currentRoomId, true),
        createPlayer(targetId, otherRoomId),
      ],
    })
    const ctx = createCtx(tables)

    await expect(
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        voterPlayerId: voterId,
        targetPlayerId: targetId,
      }),
    ).rejects.toThrow(GAME_ERROR.TARGET_NOT_IN_ROOM)
  })

  it('rejects a disconnected target', async () => {
    const tables = baseTables({
      players: [
        createPlayer(voterId, currentRoomId, true),
        { ...createPlayer(targetId, currentRoomId), isConnected: false },
      ],
    })
    const ctx = createCtx(tables)

    await expect(
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        voterPlayerId: voterId,
        targetPlayerId: targetId,
      }),
    ).rejects.toThrow(GAME_ERROR.TARGET_NOT_IN_ROOM)
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
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        voterPlayerId: voterId,
        targetPlayerId: targetId,
      }),
    ).rejects.toThrow(GAME_ERROR.VOTER_NOT_IN_ROOM)
  })

  it('rejects an eliminated target', async () => {
    const tables = baseTables({
      players: [
        createPlayer(voterId, currentRoomId, true),
        { ...createPlayer(targetId, currentRoomId), isEliminated: true },
      ],
    })
    const ctx = createCtx(tables)

    await expect(
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        voterPlayerId: voterId,
        targetPlayerId: targetId,
      }),
    ).rejects.toThrow(GAME_ERROR.TARGET_NOT_IN_ROOM)
  })

  it('rejects self-votes', async () => {
    const tables = baseTables({ players: [createPlayer(voterId, currentRoomId, true)] })
    const ctx = createCtx(tables)

    await expect(
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        voterPlayerId: voterId,
        targetPlayerId: voterId,
      }),
    ).rejects.toThrow(GAME_ERROR.CANNOT_VOTE_SELF)
  })
})
