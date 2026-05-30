import { describe, expect, it } from 'vitest'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { getMyRoleHandler, startRoundHandler } from './game'

type TableName = 'rooms' | 'players' | 'rounds' | 'roleAssignments'

type StoredDocument =
  | Doc<'rooms'>
  | Doc<'players'>
  | Doc<'rounds'>
  | Doc<'roleAssignments'>

type StoredTables = {
  rooms: Doc<'rooms'>[]
  players: Doc<'players'>[]
  rounds: Doc<'rounds'>[]
  roleAssignments: Doc<'roleAssignments'>[]
}

type QueryFilter = {
  field: string
  value: unknown
}

function roomId(id: string) {
  return id as Id<'rooms'>
}

function playerId(id: string) {
  return id as Id<'players'>
}

function roundId(id: string) {
  return id as Id<'rounds'>
}

function roleAssignmentId(id: string) {
  return id as Id<'roleAssignments'>
}

function createRoom(id: Id<'rooms'>): Doc<'rooms'> {
  return {
    _id: id,
    _creationTime: 0,
    code: 'SPY247',
    status: 'lobby',
    createdAt: 0,
  }
}

function createPlayer(
  id: Id<'players'>,
  room: Id<'rooms'>,
  isHost = false,
): Doc<'players'> {
  return {
    _id: id,
    _creationTime: 0,
    roomId: room,
    name: id,
    isHost,
    isConnected: true,
    joinedAt: 0,
  }
}

function createRoleAssignment(
  id: Id<'roleAssignments'>,
  room: Id<'rooms'>,
  round: Id<'rounds'>,
  player: Id<'players'>,
  role: 'spy' | 'civilian',
): Doc<'roleAssignments'> {
  return {
    _id: id,
    _creationTime: 0,
    roomId: room,
    roundId: round,
    playerId: player,
    role,
  }
}

function createCtx(tables: StoredTables) {
  let nextRound = 1
  let nextRoleAssignment = 1

  const findDocument = (id: string) => {
    for (const documents of Object.values(tables)) {
      const document = documents.find(({ _id }) => _id === id)

      if (document) {
        return document
      }
    }

    return null
  }

  const ctx = {
    db: {
      async get(id: string) {
        return findDocument(id)
      },
      query(table: TableName) {
        return {
          withIndex(_indexName: string, buildFilter: (q: {
            eq: (field: string, value: unknown) => {
              eq: (field: string, value: unknown) => unknown
            }
          }) => unknown) {
            const filters: QueryFilter[] = []
            const queryBuilder = {
              eq: (field: string, value: unknown) => {
                filters.push({ field, value })
                return queryBuilder
              },
            }

            buildFilter(queryBuilder)

            const collect = async () =>
              tables[table].filter((document) =>
                filters.every((filter) => {
                  const value = document[filter.field as keyof StoredDocument]
                  return value === filter.value
                }),
              )

            return {
              collect,
              async unique() {
                const documents = await collect()

                if (documents.length > 1) {
                  throw new Error('Expected unique result')
                }

                return documents[0] ?? null
              },
            }
          },
        }
      },
      async insert(table: TableName, value: Record<string, unknown>) {
        if (table === 'rounds') {
          const id = `round_${nextRound++}` as Id<'rounds'>

          tables.rounds.push({
            _id: id,
            _creationTime: 0,
            ...value,
          } as Doc<'rounds'>)

          return id
        }

        const id = `roleAssignment_${nextRoleAssignment++}` as Id<'roleAssignments'>

        tables.roleAssignments.push({
          _id: id,
          _creationTime: 0,
          ...value,
        } as Doc<'roleAssignments'>)

        return id
      },
      async patch(id: string, value: Record<string, unknown>) {
        const document = findDocument(id)

        if (document) {
          Object.assign(document, value)
        }
      },
    },
  } as unknown as MutationCtx & QueryCtx

  return ctx
}

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
      spyCount: 2,
      roundNumber: 1,
    })
    expect(tables.roleAssignments).toHaveLength(tables.players.length)
    expect(tables.roleAssignments.filter(({ role }) => role === 'spy')).toHaveLength(2)
    expect(tables.roleAssignments.filter(({ role }) => role === 'civilian')).toHaveLength(3)
    expect(tables.rooms[0].status).toBe('role_reveal')
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
    ).rejects.toThrow('Only the host can start the game')
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
    ).rejects.toThrow('Invalid player count')
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
    ).rejects.toThrow('Invalid spy count')
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
    ).rejects.toThrow('Invalid spy count')
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
    ).rejects.toThrow('Host does not belong to this room')
  })
})

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
      rounds: [
        {
          _id: currentRoundId,
          _creationTime: 0,
          roomId: currentRoomId,
          spyCount: 1,
          roundNumber: 1,
          startedAt: 0,
        },
      ],
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
      rounds: [
        {
          _id: currentRoundId,
          _creationTime: 0,
          roomId: currentRoomId,
          spyCount: 1,
          roundNumber: 1,
          startedAt: 0,
        },
      ],
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
