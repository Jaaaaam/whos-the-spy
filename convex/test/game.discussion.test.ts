import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GAME_STATUS } from '../../shared/gameStatus'
import {
  advanceDiscussionIfExpiredHandler,
  endDiscussionTurnHandler,
  getDiscussionStateHandler,
} from '../game'
import {
  createCtx,
  createPlayer,
  createRoom,
  createRound,
  playerId,
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

describe('getDiscussionStateHandler', () => {
  it('returns safe public discussion state', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const firstPlayerId = playerId('player_1')
    const activePlayerId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.DISCUSSION,
          currentRoundId,
        },
      ],
      players: [
        createPlayer(firstPlayerId, currentRoomId, true),
        createPlayer(activePlayerId, currentRoomId),
      ],
      rounds: [
        {
          ...createRound(currentRoundId, currentRoomId),
          discussionOrder: [firstPlayerId, activePlayerId],
          currentTurnIndex: 1,
          turnStartedAt: 1_000,
          turnEndsAt: 30_000,
        },
      ],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const result = await getDiscussionStateHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(result).toEqual({
      room: {
        code: 'SPY247',
        status: GAME_STATUS.DISCUSSION,
      },
      round: {
        roundNumber: 1,
        activePlayerId,
        activePlayerName: activePlayerId,
        currentTurn: 2,
        totalTurns: 2,
        turnStartedAt: 1_000,
        turnEndsAt: 30_000,
      },
    })
  })

  it('does not expose private round data', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const activePlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.DISCUSSION,
          currentRoundId,
        },
      ],
      players: [createPlayer(activePlayerId, currentRoomId, true)],
      rounds: [
        {
          ...createRound(currentRoundId, currentRoomId),
          discussionOrder: [activePlayerId],
          currentTurnIndex: 0,
          turnStartedAt: 1_000,
          turnEndsAt: 30_000,
        },
      ],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const result = await getDiscussionStateHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(result?.round).not.toHaveProperty('civilianWord')
    expect(result?.round).not.toHaveProperty('spyWord')
    expect(result?.round).not.toHaveProperty('discussionOrder')
    expect(result?.round).not.toHaveProperty('role')
  })

  it('returns null when the requested round is not the current room round', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const otherRoundId = roundId('round_2')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.DISCUSSION,
          currentRoundId,
        },
      ],
      players: [],
      rounds: [createRound(otherRoundId, currentRoomId)],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const result = await getDiscussionStateHandler(ctx, {
      roomId: currentRoomId,
      roundId: otherRoundId,
    })

    expect(result).toBeNull()
  })

  it('returns null when discussion state is incomplete', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.DISCUSSION,
          currentRoundId,
        },
      ],
      players: [createPlayer(playerId('player_1'), currentRoomId, true)],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const result = await getDiscussionStateHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(result).toBeNull()
  })

  it('returns null when the active player does not exist', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const missingPlayerId = playerId('missing_player')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.DISCUSSION,
          currentRoundId,
        },
      ],
      players: [],
      rounds: [
        {
          ...createRound(currentRoundId, currentRoomId),
          discussionOrder: [missingPlayerId],
          currentTurnIndex: 0,
          turnStartedAt: 1_000,
          turnEndsAt: 30_000,
        },
      ],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const result = await getDiscussionStateHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(result).toBeNull()
  })
})

describe('endDiscussionTurnHandler', () => {
  it('advances to the next player when the active player ends their turn', async () => {
    vi.setSystemTime(5_000)

    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const activePlayerId = playerId('player_1')
    const nextPlayerId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.DISCUSSION,
          currentRoundId,
        },
      ],
      players: [
        createPlayer(activePlayerId, currentRoomId, true),
        createPlayer(nextPlayerId, currentRoomId),
      ],
      rounds: [
        {
          ...createRound(currentRoundId, currentRoomId),
          discussionOrder: [activePlayerId, nextPlayerId],
          currentTurnIndex: 0,
          turnStartedAt: 1_000,
          turnEndsAt: 30_000,
        },
      ],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const result = await endDiscussionTurnHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      playerId: activePlayerId,
    })

    expect(result).toEqual({ advanced: true, votingStarted: false })
    expect(tables.rounds[0].currentTurnIndex).toBe(1)
    expect(tables.rounds[0].turnStartedAt).toBe(5_000)
    expect(tables.rounds[0].turnEndsAt).toBe(35_000)
    expect(tables.rooms[0].status).toBe(GAME_STATUS.DISCUSSION)
  })

  it('rejects a player who is not active', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const activePlayerId = playerId('player_1')
    const otherPlayerId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.DISCUSSION,
          currentRoundId,
        },
      ],
      players: [
        createPlayer(activePlayerId, currentRoomId, true),
        createPlayer(otherPlayerId, currentRoomId),
      ],
      rounds: [
        {
          ...createRound(currentRoundId, currentRoomId),
          discussionOrder: [activePlayerId, otherPlayerId],
          currentTurnIndex: 0,
          turnStartedAt: 1_000,
          turnEndsAt: 30_000,
        },
      ],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await expect(
      endDiscussionTurnHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        playerId: otherPlayerId,
      }),
    ).rejects.toThrow('Only the active player can end their turn.')

    expect(tables.rounds[0].currentTurnIndex).toBe(0)
  })

  it('starts voting after the final player ends their turn', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const activePlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.DISCUSSION,
          currentRoundId,
        },
      ],
      players: [createPlayer(activePlayerId, currentRoomId, true)],
      rounds: [
        {
          ...createRound(currentRoundId, currentRoomId),
          discussionOrder: [activePlayerId],
          currentTurnIndex: 0,
          turnStartedAt: 1_000,
          turnEndsAt: 30_000,
        },
      ],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const result = await endDiscussionTurnHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      playerId: activePlayerId,
    })

    expect(result).toEqual({ advanced: true, votingStarted: true })
    expect(tables.rooms[0].status).toBe(GAME_STATUS.VOTING)
  })
})

describe('advanceDiscussionIfExpiredHandler', () => {
  it('does not advance before the active turn expires', async () => {
    vi.setSystemTime(5_000)

    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const activePlayerId = playerId('player_1')
    const nextPlayerId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.DISCUSSION,
          currentRoundId,
        },
      ],
      players: [
        createPlayer(activePlayerId, currentRoomId, true),
        createPlayer(nextPlayerId, currentRoomId),
      ],
      rounds: [
        {
          ...createRound(currentRoundId, currentRoomId),
          discussionOrder: [activePlayerId, nextPlayerId],
          currentTurnIndex: 0,
          turnStartedAt: 1_000,
          turnEndsAt: 10_000,
        },
      ],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const result = await advanceDiscussionIfExpiredHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(result).toEqual({ advanced: false, votingStarted: false })
    expect(tables.rounds[0].currentTurnIndex).toBe(0)
  })

  it('advances after the active turn expires', async () => {
    vi.setSystemTime(10_001)

    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const activePlayerId = playerId('player_1')
    const nextPlayerId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.DISCUSSION,
          currentRoundId,
        },
      ],
      players: [
        createPlayer(activePlayerId, currentRoomId, true),
        createPlayer(nextPlayerId, currentRoomId),
      ],
      rounds: [
        {
          ...createRound(currentRoundId, currentRoomId),
          discussionOrder: [activePlayerId, nextPlayerId],
          currentTurnIndex: 0,
          turnStartedAt: 1_000,
          turnEndsAt: 10_000,
        },
      ],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const result = await advanceDiscussionIfExpiredHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(result).toEqual({ advanced: true, votingStarted: false })
    expect(tables.rounds[0].currentTurnIndex).toBe(1)
    expect(tables.rounds[0].turnStartedAt).toBe(10_001)
    expect(tables.rounds[0].turnEndsAt).toBe(40_001)
  })
})
