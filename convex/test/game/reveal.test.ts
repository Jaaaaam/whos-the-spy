import { describe, expect, it } from 'vitest'
import { getMyRevealHandler, getMyRoleHandler } from '../../game/reveal'
import {
  createCtx,
  createPlayer,
  createRoleAssignment,
  createRoom,
  createRound,
  playerId,
  roleAssignmentId,
  roomId,
  roundId,
  type StoredTables,
} from '../gameTestUtils'

describe('getMyRoleHandler', () => {
  it('returns only the requested player role for a round', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const currentPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
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

    const roleAssignment = await getMyRoleHandler(ctx, {
      roundId: currentRoundId,
      playerId: currentPlayerId,
    })

    expect(roleAssignment).toMatchObject({
      playerId: currentPlayerId,
      role: 'spy',
    })
  })

  it('returns null when the player has no role for the round', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [createPlayer(playerId('player_1'), currentRoomId, true)],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const roleAssignment = await getMyRoleHandler(ctx, {
      roundId: currentRoundId,
      playerId: playerId('missing_player'),
    })

    expect(roleAssignment).toBeNull()
  })
})

describe('getMyRevealHandler', () => {
  it('returns the spy word for a spy', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const currentPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
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

    const reveal = await getMyRevealHandler(ctx, {
      roundId: currentRoundId,
      playerId: currentPlayerId,
    })

    expect(reveal).toEqual({ word: 'Sandwich', seenAt: undefined })
  })

  it('returns the civilian word for a civilian', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const currentPlayerId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [createPlayer(currentPlayerId, currentRoomId, true)],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(
          roleAssignmentId('roleAssignment_1'),
          currentRoomId,
          currentRoundId,
          currentPlayerId,
          'civilian',
        ),
      ],
    }
    const ctx = createCtx(tables)

    const reveal = await getMyRevealHandler(ctx, {
      roundId: currentRoundId,
      playerId: currentPlayerId,
    })

    expect(reveal).toEqual({ word: 'Burger', seenAt: undefined })
  })

  it('returns null when the player has no role assignment', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const tables: StoredTables = {
      rooms: [createRoom(currentRoomId)],
      players: [createPlayer(playerId('player_1'), currentRoomId, true)],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const reveal = await getMyRevealHandler(ctx, {
      roundId: currentRoundId,
      playerId: playerId('missing_player'),
    })

    expect(reveal).toBeNull()
  })
})
