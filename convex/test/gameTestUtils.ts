import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { GAME_STATUS } from '../../shared/gameStatus'
import { TABLE } from '../lib/db'

type TableName = typeof TABLE[keyof typeof TABLE]

type StoredDocument =
  | Doc<typeof TABLE.ROOMS>
  | Doc<typeof TABLE.PLAYERS>
  | Doc<typeof TABLE.ROUNDS>
  | Doc<typeof TABLE.ROLE_ASSIGNMENTS>
  | Doc<typeof TABLE.VOTES>

export type StoredTables = {
  rooms: Doc<typeof TABLE.ROOMS>[]
  players: Doc<typeof TABLE.PLAYERS>[]
  rounds: Doc<typeof TABLE.ROUNDS>[]
  roleAssignments: Doc<typeof TABLE.ROLE_ASSIGNMENTS>[]
  votes?: Doc<typeof TABLE.VOTES>[]
}

type QueryFilter = {
  field: string
  value: unknown
}

export function roomId(id: string) {
  return id as Id<typeof TABLE.ROOMS>
}

export function playerId(id: string) {
  return id as Id<typeof TABLE.PLAYERS>
}

export function roundId(id: string) {
  return id as Id<typeof TABLE.ROUNDS>
}

export function roleAssignmentId(id: string) {
  return id as Id<typeof TABLE.ROLE_ASSIGNMENTS>
}

export function voteId(id: string) {
  return id as Id<typeof TABLE.VOTES>
}

export function createRoom(id: Id<typeof TABLE.ROOMS>): Doc<typeof TABLE.ROOMS> {
  return {
    _id: id,
    _creationTime: 0,
    code: 'SPY247',
    status: GAME_STATUS.LOBBY,
    createdAt: 0,
  }
}

export function createPlayer(
  id: Id<typeof TABLE.PLAYERS>,
  room: Id<typeof TABLE.ROOMS>,
  isHost = false,
): Doc<typeof TABLE.PLAYERS> {
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
  id: Id<typeof TABLE.ROLE_ASSIGNMENTS>,
  room: Id<typeof TABLE.ROOMS>,
  round: Id<typeof TABLE.ROUNDS>,
  player: Id<typeof TABLE.PLAYERS>,
  role: 'spy' | 'civilian',
  seenAt?: number,
): Doc<typeof TABLE.ROLE_ASSIGNMENTS> {
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
  id: Id<typeof TABLE.ROUNDS>,
  room: Id<typeof TABLE.ROOMS>,
): Doc<typeof TABLE.ROUNDS> {
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
    hadElimination: true,
  }
}

export function createRoomWithStatus(
  id: Id<typeof TABLE.ROOMS>,
  status: Doc<typeof TABLE.ROOMS>['status'],
  currentRoundId?: Id<typeof TABLE.ROUNDS>,
): Doc<typeof TABLE.ROOMS> {
  return { ...createRoom(id), status, ...(currentRoundId !== undefined && { currentRoundId }) }
}

export function createDiscussionRound(
  id: Id<typeof TABLE.ROUNDS>,
  room: Id<typeof TABLE.ROOMS>,
  options: {
    discussionOrder: Id<typeof TABLE.PLAYERS>[]
    currentTurnIndex: number
    turnStartedAt: number
    turnEndsAt: number
  },
): Doc<typeof TABLE.ROUNDS> {
  return { ...createRound(id, room), ...options }
}

export function createVotingRound(
  id: Id<typeof TABLE.ROUNDS>,
  room: Id<typeof TABLE.ROOMS>,
  votingEndsAt: number,
): Doc<typeof TABLE.ROUNDS> {
  return { ...createRound(id, room), votingEndsAt }
}

export function createBattleRound(
  id: Id<typeof TABLE.ROUNDS>,
  room: Id<typeof TABLE.ROOMS>,
  options: {
    tieCandidateIds: Id<typeof TABLE.PLAYERS>[]
    battleEndsAt: number
  },
): Doc<typeof TABLE.ROUNDS> {
  return { ...createRound(id, room), isTie: true, ...options }
}

export function createVote(
  id: Id<typeof TABLE.VOTES>,
  room: Id<typeof TABLE.ROOMS>,
  round: Id<typeof TABLE.ROUNDS>,
  voterPlayerId: Id<typeof TABLE.PLAYERS>,
  targetPlayerId?: Id<typeof TABLE.PLAYERS>,
): Doc<typeof TABLE.VOTES> {
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
  let nextRoom = 1
  let nextPlayer = 1
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
        if (table === TABLE.ROOMS) {
          const id = `room_${nextRoom++}` as Id<typeof TABLE.ROOMS>

          storedTables.rooms.push({
            _id: id,
            _creationTime: 0,
            ...value,
          } as Doc<typeof TABLE.ROOMS>)

          return id
        }

        if (table === TABLE.PLAYERS) {
          const id = `player_${nextPlayer++}` as Id<typeof TABLE.PLAYERS>

          storedTables.players.push({
            _id: id,
            _creationTime: 0,
            ...value,
          } as Doc<typeof TABLE.PLAYERS>)

          return id
        }

        if (table === TABLE.ROUNDS) {
          const id = `round_${nextRound++}` as Id<typeof TABLE.ROUNDS>

          storedTables.rounds.push({
            _id: id,
            _creationTime: 0,
            ...value,
          } as Doc<typeof TABLE.ROUNDS>)

          return id
        }

        if (table === TABLE.VOTES) {
          const id = `vote_${nextVote++}` as Id<typeof TABLE.VOTES>

          storedTables.votes.push({
            _id: id,
            _creationTime: 0,
            ...value,
          } as Doc<typeof TABLE.VOTES>)

          return id
        }

        const id = `roleAssignment_${nextRoleAssignment++}` as Id<typeof TABLE.ROLE_ASSIGNMENTS>

        storedTables.roleAssignments.push({
          _id: id,
          _creationTime: 0,
          ...value,
        } as Doc<typeof TABLE.ROLE_ASSIGNMENTS>)

        return id
      },
      async patch(id: string, value: Record<string, unknown>) {
        const document = findDocument(id)

        if (document) {
          Object.assign(document, value)
        }
      },
      async delete(id: string) {
        for (const [table, documents] of Object.entries(storedTables)) {
          const index = documents.findIndex(({ _id }) => _id === id)
          if (index !== -1) {
            (storedTables[table as TableName] as StoredDocument[]).splice(index, 1)
            return
          }
        }
      },
    },
  } as unknown as MutationCtx & QueryCtx

  return ctx
}
