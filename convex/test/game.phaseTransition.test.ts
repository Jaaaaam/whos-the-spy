import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GAME_ERROR } from '../game/errors'
import {
  advanceRevealIfExpiredHandler,
  markRoleSeenHandler,
} from '../game/reveal'
import {
  createCtx,
  createPlayer,
  createRoleAssignment,
  createRoom,
  createRoomWithStatus,
  createRound,
  playerId,
  roleAssignmentId,
  roomId,
  roundId,
  type StoredTables,
} from './gameTestUtils'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('markRoleSeenHandler', () => {
  it('marks the current player role assignment as seen', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const currentPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, 'role_reveal', currentRoundId)],
      players: [createPlayer(currentPlayerId, currentRoomId, true)],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(
          roleAssignmentId('roleAssignment_1'),
          currentRoomId,
          currentRoundId,
          currentPlayerId,
          'spy',
        ),
      ],
    }
    const ctx = createCtx(tables)

    const result = await markRoleSeenHandler(ctx, {
      roundId: currentRoundId,
      playerId: currentPlayerId,
    })

    expect(tables.roleAssignments[0].seenAt).toEqual(result.seenAt)
    expect(result.seenAt).toEqual(expect.any(Number))
  })

  it('does not advance the room when another player has not seen their role', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const currentPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, 'role_reveal')],
      players: [
        createPlayer(currentPlayerId, currentRoomId, true),
        createPlayer(playerId('player_2'), currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(
          roleAssignmentId('roleAssignment_1'),
          currentRoomId,
          currentRoundId,
          currentPlayerId,
          'spy',
        ),
        createRoleAssignment(
          roleAssignmentId('roleAssignment_2'),
          currentRoomId,
          currentRoundId,
          playerId('player_2'),
          'civilian',
        ),
      ],
    }
    const ctx = createCtx(tables)

    await markRoleSeenHandler(ctx, {
      roundId: currentRoundId,
      playerId: currentPlayerId,
    })

    expect(tables.rooms[0].status).toBe('role_reveal')
  })

  it('advances the room to discussion when every player has seen their role', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const currentPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, 'role_reveal', currentRoundId)],
      players: [
        createPlayer(currentPlayerId, currentRoomId, true),
        createPlayer(playerId('player_2'), currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(
          roleAssignmentId('roleAssignment_1'),
          currentRoomId,
          currentRoundId,
          currentPlayerId,
          'spy',
        ),
        createRoleAssignment(
          roleAssignmentId('roleAssignment_2'),
          currentRoomId,
          currentRoundId,
          playerId('player_2'),
          'civilian',
          1,
        ),
      ],
    }
    const ctx = createCtx(tables)

    await markRoleSeenHandler(ctx, {
      roundId: currentRoundId,
      playerId: currentPlayerId,
    })

    expect(tables.rooms[0].status).toBe('discussion')
    expect(tables.rounds[0].discussionOrder).toHaveLength(tables.players.length)
    expect(new Set(tables.rounds[0].discussionOrder)).toEqual(
      new Set(tables.players.map((player) => player._id)),
    )
    expect(tables.rounds[0].currentTurnIndex).toBe(0)
    expect(tables.rounds[0].turnEndsAt).toEqual(expect.any(Number))
  })

  it('throws when the player has no role assignment', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, 'role_reveal')],
      players: [createPlayer(playerId('player_1'), currentRoomId, true)],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await expect(
      markRoleSeenHandler(ctx, {
        roundId: currentRoundId,
        playerId: playerId('missing_player'),
      }),
    ).rejects.toThrow(GAME_ERROR.ROLE_ASSIGNMENT_NOT_FOUND)
  })
})

describe('advanceRevealIfExpiredHandler', () => {
  const currentRoomId = roomId('room_1')
  const currentRoundId = roundId('round_1')

  function baseRevealTables(overrides: Partial<StoredTables> = {}): StoredTables {
    return {
      rooms: [createRoomWithStatus(currentRoomId, 'role_reveal', currentRoundId)],
      players: [
        createPlayer(playerId('player_1'), currentRoomId, true),
        createPlayer(playerId('player_2'), currentRoomId),
      ],
      rounds: [{ ...createRound(currentRoundId, currentRoomId), revealEndsAt: 2_000 }],
      roleAssignments: [],
      ...overrides,
    }
  }

  it('does not advance the room before the reveal timer expires', async () => {
    vi.setSystemTime(1_000)

    const tables = baseRevealTables()
    const ctx = createCtx(tables)

    const result = await advanceRevealIfExpiredHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(result).toEqual({ advanced: false })
    expect(tables.rooms[0].status).toBe('role_reveal')
  })

  it('advances the room to discussion after the reveal timer expires', async () => {
    vi.setSystemTime(2_001)

    const tables = baseRevealTables()
    const ctx = createCtx(tables)

    const result = await advanceRevealIfExpiredHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(result).toEqual({ advanced: true })
    expect(tables.rooms[0].status).toBe('discussion')
    expect(tables.rounds[0].discussionOrder).toHaveLength(tables.players.length)
    expect(new Set(tables.rounds[0].discussionOrder)).toEqual(
      new Set(tables.players.map((player) => player._id)),
    )
    expect(tables.rounds[0].currentTurnIndex).toBe(0)
    expect(tables.rounds[0].turnEndsAt).toEqual(expect.any(Number))
  })

  it('does not start discussion without players', async () => {
    vi.setSystemTime(2_001)

    const tables = baseRevealTables({ players: [] })
    const ctx = createCtx(tables)

    await expect(
      advanceRevealIfExpiredHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
      }),
    ).rejects.toThrow(GAME_ERROR.CANNOT_START_DISCUSSION_WITHOUT_PLAYERS)
  })

  it('does nothing when the room is already out of role reveal', async () => {
    vi.setSystemTime(2_001)

    const tables = baseRevealTables({
      rooms: [createRoomWithStatus(currentRoomId, 'discussion', currentRoundId)],
    })
    const ctx = createCtx(tables)

    const result = await advanceRevealIfExpiredHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(result).toEqual({ advanced: false })
    expect(tables.rooms[0].status).toBe('discussion')
  })

  it('throws when the round is not the current room round', async () => {
    vi.setSystemTime(2_001)

    const otherRoundId = roundId('round_2')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, 'role_reveal', currentRoundId)],
      players: [],
      rounds: [{ ...createRound(otherRoundId, currentRoomId), revealEndsAt: 2_000 }],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await expect(
      advanceRevealIfExpiredHandler(ctx, {
        roomId: currentRoomId,
        roundId: otherRoundId,
      }),
    ).rejects.toThrow(GAME_ERROR.NOT_CURRENT_ROOM_ROUND)
  })
})
