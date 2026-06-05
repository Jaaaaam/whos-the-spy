import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { GAME_STATUS } from '../../shared/gameStatus'
import { TABLE } from '../lib/db'

type TableName = typeof TABLE[keyof typeof TABLE]

type StoredDocument =
  | Doc<'rooms'>
  | Doc<'players'>
  | Doc<'rounds'>
  | Doc<'roleAssignments'>
  | Doc<'votes'>

export type StoredTables = {
  rooms: Doc<'rooms'>[]
  players: Doc<'players'>[]
  rounds: Doc<'rounds'>[]
  roleAssignments: Doc<'roleAssignments'>[]
  votes?: Doc<'votes'>[]
}

type QueryFilter = {
  field: string
  value: unknown
}

export function roomId(id: string) {
  return id as Id<'rooms'>
}

export function playerId(id: string) {
  return id as Id<'players'>
}

export function roundId(id: string) {
  return id as Id<'rounds'>
}

export function roleAssignmentId(id: string) {
  return id as Id<'roleAssignments'>
}

export function voteId(id: string) {
  return id as Id<'votes'>
}

export function createRoom(id: Id<'rooms'>): Doc<'rooms'> {
  return {
    _id: id,
    _creationTime: 0,
    code: 'SPY247',
    status: GAME_STATUS.LOBBY,
    createdAt: 0,
  }
}

export function createPlayer(
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

export function createRoleAssignment(
  id: Id<'roleAssignments'>,
  room: Id<'rooms'>,
  round: Id<'rounds'>,
  player: Id<'players'>,
  role: 'spy' | 'civilian',
  seenAt?: number,
): Doc<'roleAssignments'> {
  return {
    _id: id,
    _creationTime: 0,
    roomId: room,
    roundId: round,
    playerId: player,
    role,
    seenAt,
  }
}

export function createRound(
  id: Id<'rounds'>,
  room: Id<'rooms'>,
): Doc<'rounds'> {
  return {
    _id: id,
    _creationTime: 0,
    roomId: room,
    mode: 'similar_words',
    civilianWord: 'Burger',
    spyWord: 'Sandwich',
    spyCount: 1,
    roundNumber: 1,
    startedAt: 0,
  }
}

export function createVote(
  id: Id<'votes'>,
  room: Id<'rooms'>,
  round: Id<'rounds'>,
  voterPlayerId: Id<'players'>,
  targetPlayerId: Id<'players'>,
): Doc<'votes'> {
  return {
    _id: id,
    _creationTime: 0,
    roomId: room,
    roundId: round,
    voterPlayerId,
    targetPlayerId,
    createdAt: 0,
    updatedAt: 0,
  }
}

export function createCtx(tables: StoredTables) {
  const storedTables = {
    ...tables,
    votes: tables.votes ?? [],
  }
  let nextRound = 1
  let nextRoleAssignment = 1
  let nextVote = 1

  const findDocument = (id: string) => {
    for (const documents of Object.values(storedTables)) {
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
              storedTables[table].filter((document) =>
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
        if (table === TABLE.ROUNDS) {
          const id = `round_${nextRound++}` as Id<'rounds'>

          storedTables.rounds.push({
            _id: id,
            _creationTime: 0,
            ...value,
          } as Doc<'rounds'>)

          return id
        }

        if (table === TABLE.VOTES) {
          const id = `vote_${nextVote++}` as Id<'votes'>

          storedTables.votes.push({
            _id: id,
            _creationTime: 0,
            ...value,
          } as Doc<'votes'>)

          return id
        }

        const id = `roleAssignment_${nextRoleAssignment++}` as Id<'roleAssignments'>

        storedTables.roleAssignments.push({
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
