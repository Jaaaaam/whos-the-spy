import { describe, expect, it } from 'vitest'
import { GAME_ERROR } from '../../game/errors'
import { startRoundHandler } from '../../game/startRound'
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
} from '../gameTestUtils'
import { GAME_STATUS } from '../../../shared/gameStatus'

describe('startRoundHandler', () => {
  it('creates a round, persists role assignments, and moves room to role reveal', async () => {
    const currentRoomId = roomId('room_1')
    const hostPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [
        createPlayer(hostPlayerId, currentRoomId, true),
        createPlayer(playerId('player_2'), currentRoomId),
        createPlayer(playerId('player_3'), currentRoomId),
        createPlayer(playerId('player_4'), currentRoomId),
        createPlayer(playerId('player_5'), currentRoomId),
      ],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const result = await startRoundHandler(ctx, {
      roomId: currentRoomId,
      hostPlayerId,
      spyCount: 2,
    })

    expect(result.spyCount).toBe(2)
    expect(result.roundNumber).toBe(1)
    expect(tables.rounds).toHaveLength(1)
    expect(tables.rounds[0]).toMatchObject({
      _id: result.roundId,
      roomId: currentRoomId,
      mode: 'similar_words',
      civilianWord: expect.any(String),
      spyWord: expect.any(String),
      spyCount: 2,
      roundNumber: 1,
      revealEndsAt: expect.any(Number),
    })
    expect(tables.rounds[0].revealEndsAt).toBeGreaterThan(tables.rounds[0].startedAt)
    expect(tables.roleAssignments).toHaveLength(tables.players.length)
    expect(tables.roleAssignments.filter(({ role }) => role === 'spy')).toHaveLength(2)
    expect(tables.roleAssignments.filter(({ role }) => role === 'civilian')).toHaveLength(3)
    expect(tables.rooms[0].status).toBe('role_reveal')
    expect(tables.rooms[0].currentRoundId).toBe(result.roundId)
  })

  it('uses recommended spy count when spy count is not provided', async () => {
    const currentRoomId = roomId('room_1')
    const hostPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [
        createPlayer(hostPlayerId, currentRoomId, true),
        createPlayer(playerId('player_2'), currentRoomId),
        createPlayer(playerId('player_3'), currentRoomId),
        createPlayer(playerId('player_4'), currentRoomId),
        createPlayer(playerId('player_5'), currentRoomId),
        createPlayer(playerId('player_6'), currentRoomId),
        createPlayer(playerId('player_7'), currentRoomId),
      ],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const result = await startRoundHandler(ctx, {
      roomId: currentRoomId,
      hostPlayerId,
    })

    expect(result.spyCount).toBe(2)
    expect(tables.rounds[0].spyCount).toBe(2)
    expect(tables.roleAssignments.filter(({ role }) => role === 'spy')).toHaveLength(2)
  })

  it('prevents non-host players from starting the round', async () => {
    const currentRoomId = roomId('room_1')
    const hostPlayerId = playerId('player_1')
    const guestPlayerId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [
        createPlayer(hostPlayerId, currentRoomId, true),
        createPlayer(guestPlayerId, currentRoomId),
        createPlayer(playerId('player_3'), currentRoomId),
      ],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await expect(
      startRoundHandler(ctx, {
        roomId: currentRoomId,
        hostPlayerId: guestPlayerId,
      }),
    ).rejects.toThrow(GAME_ERROR.NOT_HOST)
  })

  it('prevents starting a round with fewer than 3 players', async () => {
    const currentRoomId = roomId('room_1')
    const hostPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [
        createPlayer(hostPlayerId, currentRoomId, true),
        createPlayer(playerId('player_2'), currentRoomId),
      ],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await expect(
      startRoundHandler(ctx, {
        roomId: currentRoomId,
        hostPlayerId,
      }),
    ).rejects.toThrow(GAME_ERROR.INVALID_PLAYER_COUNT)
  })

  it('prevents starting a round with spy count of 0', async () => {
    const currentRoomId = roomId('room_1')
    const hostPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [
        createPlayer(hostPlayerId, currentRoomId, true),
        createPlayer(playerId('player_2'), currentRoomId),
        createPlayer(playerId('player_3'), currentRoomId),
      ],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await expect(
      startRoundHandler(ctx, {
        roomId: currentRoomId,
        hostPlayerId,
        spyCount: 0,
      }),
    ).rejects.toThrow(GAME_ERROR.INVALID_SPY_COUNT)
  })

  it('prevents starting a round when spy count is equal to half of players', async () => {
    const currentRoomId = roomId('room_1')
    const hostPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [
        createPlayer(hostPlayerId, currentRoomId, true),
        createPlayer(playerId('player_2'), currentRoomId),
        createPlayer(playerId('player_3'), currentRoomId),
        createPlayer(playerId('player_4'), currentRoomId),
      ],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await expect(
      startRoundHandler(ctx, {
        roomId: currentRoomId,
        hostPlayerId,
        spyCount: 2,
      }),
    ).rejects.toThrow(GAME_ERROR.INVALID_SPY_COUNT)
  })

  it('assigns roles only to connected players', async () => {
    const currentRoomId = roomId('room_1')
    const hostPlayerId = playerId('player_1')
    const disconnectedPlayerId = playerId('player_4')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [
        createPlayer(hostPlayerId, currentRoomId, true),
        createPlayer(playerId('player_2'), currentRoomId),
        createPlayer(playerId('player_3'), currentRoomId),
        {
          ...createPlayer(disconnectedPlayerId, currentRoomId),
          isConnected: false,
        },
      ],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await startRoundHandler(ctx, {
      roomId: currentRoomId,
      hostPlayerId,
      spyCount: 1,
    })

    expect(tables.roleAssignments).toHaveLength(3)
    expect(tables.roleAssignments.map(({ playerId }) => playerId)).not.toContain(
      disconnectedPlayerId,
    )
  })

  it('preserves spy assignments from round 1 in subsequent rounds', async () => {
    const currentRoomId = roomId('room_1')
    const hostPlayerId = playerId('player_1')
    const spyPlayerId = playerId('player_2')
    const civilian1Id = playerId('player_3')
    const civilian2Id = playerId('player_4')
    const round1Id = roundId('round_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [
        createPlayer(hostPlayerId, currentRoomId, true),
        createPlayer(spyPlayerId, currentRoomId),
        createPlayer(civilian1Id, currentRoomId),
        createPlayer(civilian2Id, currentRoomId),
      ],
      rounds: [createRound(round1Id, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, round1Id, hostPlayerId, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, round1Id, spyPlayerId, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_3'), currentRoomId, round1Id, civilian1Id, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_4'), currentRoomId, round1Id, civilian2Id, 'civilian'),
      ],
    }
    const ctx = createCtx(tables)

    const result = await startRoundHandler(ctx, { roomId: currentRoomId, hostPlayerId })

    expect(result.roundNumber).toBe(2)
    expect(result.spyCount).toBe(1)

    const round2Assignments = tables.roleAssignments.filter(
      (a) => !['ra_1', 'ra_2', 'ra_3', 'ra_4'].includes(a._id),
    )
    expect(round2Assignments).toHaveLength(4)
    expect(round2Assignments.find((a) => a.playerId === spyPlayerId)?.role).toBe('spy')
    expect(round2Assignments.find((a) => a.playerId === hostPlayerId)?.role).toBe('civilian')
    expect(round2Assignments.find((a) => a.playerId === civilian1Id)?.role).toBe('civilian')
    expect(round2Assignments.find((a) => a.playerId === civilian2Id)?.role).toBe('civilian')
  })

  it('excludes eliminated players when starting a new round', async () => {
    const currentRoomId = roomId('room_1')
    const hostPlayerId = playerId('player_1')
    const spyPlayerId = playerId('player_2')
    const eliminatedPlayerId = playerId('player_3')
    const civilian2Id = playerId('player_4')
    const round1Id = roundId('round_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [
        createPlayer(hostPlayerId, currentRoomId, true),
        createPlayer(spyPlayerId, currentRoomId),
        { ...createPlayer(eliminatedPlayerId, currentRoomId), isEliminated: true },
        createPlayer(civilian2Id, currentRoomId),
      ],
      rounds: [createRound(round1Id, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, round1Id, hostPlayerId, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, round1Id, spyPlayerId, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_3'), currentRoomId, round1Id, eliminatedPlayerId, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_4'), currentRoomId, round1Id, civilian2Id, 'civilian'),
      ],
    }
    const ctx = createCtx(tables)

    await startRoundHandler(ctx, { roomId: currentRoomId, hostPlayerId })

    const round2Assignments = tables.roleAssignments.filter(
      (a) => !['ra_1', 'ra_2', 'ra_3', 'ra_4'].includes(a._id),
    )
    expect(round2Assignments).toHaveLength(3)
    expect(round2Assignments.map((a) => a.playerId)).not.toContain(eliminatedPlayerId)
  })

  it('assigns 3 spies and 12 civilians when starting with 15 players', async () => {
    const currentRoomId = roomId('room_1')
    const hostPlayerId = playerId('player_1')
    const players = Array.from({ length: 15 }, (_, i) =>
      createPlayer(playerId(`player_${i + 1}`), currentRoomId, i === 0),
    )
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players,
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const result = await startRoundHandler(ctx, { roomId: currentRoomId, hostPlayerId })

    expect(result.spyCount).toBe(3)
    expect(tables.roleAssignments).toHaveLength(15)
    expect(tables.roleAssignments.filter(({ role }) => role === 'spy')).toHaveLength(3)
    expect(tables.roleAssignments.filter(({ role }) => role === 'civilian')).toHaveLength(12)
    expect(tables.rooms[0].status).toBe('role_reveal')
  })

  it('prevents a host from another room from starting the round', async () => {
    const currentRoomId = roomId('room_1')
    const otherRoomId = roomId('room_2')
    const otherRoomHostPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId), createRoom(otherRoomId)],
      players: [
        createPlayer(otherRoomHostPlayerId, otherRoomId, true),
        createPlayer(playerId('player_2'), currentRoomId),
        createPlayer(playerId('player_3'), currentRoomId),
        createPlayer(playerId('player_4'), currentRoomId),
      ],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await expect(
      startRoundHandler(ctx, {
        roomId: currentRoomId,
        hostPlayerId: otherRoomHostPlayerId,
      }),
    ).rejects.toThrow(GAME_ERROR.HOST_NOT_IN_ROOM)
  })

  it('excludes eliminated and disconnected players from discussion order in round 2+', async () => {
    const currentRoomId = roomId('room_1')
    const hostPlayerId = playerId('player_1')
    const spyPlayerId = playerId('player_2')
    const civilian1Id = playerId('player_3')
    const eliminatedId = playerId('player_4')
    const disconnectedId = playerId('player_5')
    const round1Id = roundId('round_1')

    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.RESULTS)],
      players: [
        createPlayer(hostPlayerId, currentRoomId, true),
        createPlayer(spyPlayerId, currentRoomId),
        createPlayer(civilian1Id, currentRoomId),
        { ...createPlayer(eliminatedId, currentRoomId), isEliminated: true },
        { ...createPlayer(disconnectedId, currentRoomId), isConnected: false },
      ],
      rounds: [createRound(round1Id, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, round1Id, hostPlayerId, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, round1Id, spyPlayerId, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_3'), currentRoomId, round1Id, civilian1Id, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_4'), currentRoomId, round1Id, eliminatedId, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_5'), currentRoomId, round1Id, disconnectedId, 'civilian'),
      ]
    }
    const ctx = createCtx(tables)

    const result = await startRoundHandler(ctx, { roomId: currentRoomId, hostPlayerId })

    const round2 = tables.rounds.find(r => r._id === result.roundId)!
    expect(tables.rooms[0].status).toBe(GAME_STATUS.DISCUSSION)
    expect(round2.revealEndsAt).toBeUndefined()
    expect(round2.discussionOrder).toHaveLength(3)
    expect(round2.discussionOrder).not.toContain(eliminatedId)
    expect(round2.discussionOrder).not.toContain(disconnectedId)
    expect(round2.currentTurnIndex).toBe(0)
    expect(round2.turnStartedAt).toBeTypeOf('number')
    expect(round2.turnEndsAt).toBeTypeOf('number')
  })

  it('skips role reveal and starts discussion directly for round 2+', async () => {
    const currentRoomId = roomId('room_1')
    const hostPlayerId = playerId('player_1')
    const spyPlayerId = playerId('player_2')
    const civilian1Id = playerId('player_3')
    const round1Id = roundId('round_1')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.RESULTS)],
      players: [
        createPlayer(hostPlayerId, currentRoomId, true),
        createPlayer(spyPlayerId, currentRoomId),
        createPlayer(civilian1Id, currentRoomId),
      ],
      rounds: [createRound(round1Id, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, round1Id, hostPlayerId, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, round1Id, spyPlayerId, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_3'), currentRoomId, round1Id, civilian1Id, 'civilian'),
      ],
    }
    const ctx = createCtx(tables)

    const result = await startRoundHandler(ctx, { roomId: currentRoomId, hostPlayerId })

    expect(result.roundNumber).toBe(2)
    expect(tables.rooms[0].status).toBe(GAME_STATUS.DISCUSSION)
    const round2 = tables.rounds.find(r => r._id === result.roundId)!
    expect(round2.revealEndsAt).toBeUndefined()
    expect(round2.discussionOrder).toHaveLength(3)
    expect(round2.currentTurnIndex).toBe(0)
    expect(round2.turnStartedAt).toBeTypeOf('number')
    expect(round2.turnEndsAt).toBeTypeOf('number')
  })
})
