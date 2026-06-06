import { describe, expect, it } from 'vitest'
import { joinRoomHandler, setPlayerConnectionHandler } from '../players'
import {
  createCtx,
  createPlayer,
  createRoom,
  playerId,
  roomId,
  type StoredTables,
} from './gameTestUtils'

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
