import { describe, expect, it, vi, afterEach } from 'vitest'
import { joinRoomHandler, setPlayerConnectionHandler, setHeartbeatHandler, markDisconnectedPlayersHandler } from '../players'
import {
  createCtx,
  createPlayer,
  createRoom,
  playerId,
  roomId,
  type StoredTables,
} from './gameTestUtils'
import { HEARTBEAT_INTERVAL_MS } from '../game/constants'

afterEach(() => {
  vi.useRealTimers()
})

describe('joinRoomHandler', () => {
  it('reconnects a saved player instead of creating a duplicate', async () => {
    const currentRoomId = roomId('room_1')
    const currentPlayerId = playerId('player_1')
    const disconnectedPlayer = {
      ...createPlayer(currentPlayerId, currentRoomId),
      name: 'Alex',
      isConnected: false,
    }
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [disconnectedPlayer],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const result = await joinRoomHandler(ctx, {
      roomCode: 'SPY247',
      playerName: 'Ignored Name',
      currentPlayerId,
    })

    expect(result).toMatchObject({
      playerId: currentPlayerId,
      roomId: currentRoomId,
      roomCode: 'SPY247',
      rejoined: true,
    })
    expect(tables.players).toHaveLength(1)
    expect(tables.players[0]).toMatchObject({
      name: 'Alex',
      isConnected: true,
    })
  })

  it('ignores a saved player from another room and creates a new player', async () => {
    const currentRoomId = roomId('room_1')
    const otherRoomId = roomId('room_2')
    const otherPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId), { ...createRoom(otherRoomId), code: 'OTHER1' }],
      players: [createPlayer(otherPlayerId, otherRoomId)],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const result = await joinRoomHandler(ctx, {
      roomCode: 'SPY247',
      playerName: 'Alex',
      currentPlayerId: otherPlayerId,
    })

    expect(result).toMatchObject({
      roomId: currentRoomId,
      roomCode: 'SPY247',
      rejoined: false,
    })
    expect(tables.players).toHaveLength(2)
    expect(tables.players[1]).toMatchObject({
      roomId: currentRoomId,
      name: 'Alex',
      isConnected: true,
    })
  })

  it('still prevents duplicate names for new players', async () => {
    const currentRoomId = roomId('room_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [{ ...createPlayer(playerId('player_1'), currentRoomId), name: 'Alex' }],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await expect(
      joinRoomHandler(ctx, {
        roomCode: 'SPY247',
        playerName: 'Alex',
      }),
    ).rejects.toThrow('Player name already taken in this room')
  })
})

describe('setPlayerConnectionHandler', () => {
  it('marks a room player as disconnected', async () => {
    const currentRoomId = roomId('room_1')
    const currentPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [createPlayer(currentPlayerId, currentRoomId)],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const result = await setPlayerConnectionHandler(ctx, {
      roomId: currentRoomId,
      playerId: currentPlayerId,
      isConnected: false,
    })

    expect(result).toEqual({
      playerId: currentPlayerId,
      isConnected: false,
    })
    expect(tables.players[0].isConnected).toBe(false)
  })
})

describe('setHeartbeatHandler', () => {
  it('updates lastSeenAt for a connected player', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)

    const currentRoomId = roomId('room_1')
    const currentPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [{ ...createPlayer(currentPlayerId, currentRoomId), lastSeenAt: 0 }],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await setHeartbeatHandler(ctx, { playerId: currentPlayerId, roomId: currentRoomId })

    expect(tables.players[0].lastSeenAt).toBe(1_000_000)
  })

  it('throws if the player does not belong to the given room', async () => {
    const currentRoomId = roomId('room_1')
    const otherRoomId = roomId('room_2')
    const currentPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [createPlayer(currentPlayerId, otherRoomId)],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await expect(
      setHeartbeatHandler(ctx, { playerId: currentPlayerId, roomId: currentRoomId })
    ).rejects.toThrow()
  })
})

describe('markDisconnectedPlayersHandler', () => {
  it('marks a stale connected player as disconnected', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(HEARTBEAT_INTERVAL_MS + 1)

    const currentRoomId = roomId('room_1')
    const currentPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [{ ...createPlayer(currentPlayerId, currentRoomId), lastSeenAt: 0 }],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await markDisconnectedPlayersHandler(ctx)

    expect(tables.players[0].isConnected).toBe(false)
  })

  it('does not disconnect a player who heartbeated recently', async () => {
    vi.useFakeTimers()
    const now = HEARTBEAT_INTERVAL_MS + 1
    vi.setSystemTime(now)

    const currentRoomId = roomId('room_1')
    const currentPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [{ ...createPlayer(currentPlayerId, currentRoomId), lastSeenAt: now - 5_000 }],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await markDisconnectedPlayersHandler(ctx)

    expect(tables.players[0].isConnected).toBe(true)
  })

  it('does not touch an already-disconnected player', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(HEARTBEAT_INTERVAL_MS + 1)

    const currentRoomId = roomId('room_1')
    const currentPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [{ ...createPlayer(currentPlayerId, currentRoomId), isConnected: false, lastSeenAt: 0 }],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await markDisconnectedPlayersHandler(ctx)

    expect(tables.players[0].isConnected).toBe(false)
  })

  it('marks multiple stale players as disconnected', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(HEARTBEAT_INTERVAL_MS + 1)

    const currentRoomId = roomId('room_1')
    const player1 = playerId('player_1')
    const player2 = playerId('player_2')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [
        { ...createPlayer(player1, currentRoomId), lastSeenAt: 0 },
        { ...createPlayer(player2, currentRoomId), lastSeenAt: 0 },
      ],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    await markDisconnectedPlayersHandler(ctx)

    expect(tables.players[0].isConnected).toBe(false)
    expect(tables.players[1].isConnected).toBe(false)
  })
})
