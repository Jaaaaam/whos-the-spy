import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GAME_STATUS } from '../../../shared/gameStatus'
import { advanceVotingIfExpiredHandler } from '../../game/voting'
import {
  createCtx,
  createPlayer,
  createRoomWithStatus,
  createVote,
  createVotingRound,
  playerId,
  roomId,
  roundId,
  type StoredTables,
  voteId,
} from '../gameTestUtils'

describe('advanceVotingIfExpiredHandler', () => {
  const currentRoomId = roomId('room_1')
  const currentRoundId = roundId('round_1')
  const player1 = playerId('player_1')
  const player2 = playerId('player_2')

  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  function baseTables(overrides: Partial<StoredTables> = {}): StoredTables {
    return {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [createPlayer(player1, currentRoomId), createPlayer(player2, currentRoomId)],
      rounds: [createVotingRound(currentRoundId, currentRoomId, 60_000)],
      roleAssignments: [],
      votes: [],
      ...overrides,
    }
  }

  it('no-ops when timer has not expired', async () => {
    vi.setSystemTime(30_000)
    const tables = baseTables()
    const result = await advanceVotingIfExpiredHandler(createCtx(tables), { roomId: currentRoomId, roundId: currentRoundId })
    expect(result.advanced).toBe(false)
    expect(tables.rooms[0].status).toBe(GAME_STATUS.VOTING)
  })

  it('abstains non-voters and finalizes when timer expires', async () => {
    vi.setSystemTime(90_000)
    const tables = baseTables()
    const result = await advanceVotingIfExpiredHandler(createCtx(tables), { roomId: currentRoomId, roundId: currentRoundId })
    expect(result.advanced).toBe(true)
    expect(tables.rooms[0].status).toBe(GAME_STATUS.RESULTS)
    expect(tables.votes).toHaveLength(2)
    expect(tables.votes?.every(v => v.targetPlayerId === undefined)).toBe(true)
  })

  it('does not create duplicate abstentions for players who already voted', async () => {
    vi.setSystemTime(90_000)
    const tables = baseTables({
      votes: [createVote(voteId('vote_1'), currentRoomId, currentRoundId, player1, player2)],
    })
    await advanceVotingIfExpiredHandler(createCtx(tables), { roomId: currentRoomId, roundId: currentRoundId })
    expect(tables.votes).toHaveLength(2)
  })

  it('no-ops when room is not in voting phase', async () => {
    vi.setSystemTime(90_000)
    const tables = baseTables({
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.RESULTS, currentRoundId)],
    })
    const result = await advanceVotingIfExpiredHandler(createCtx(tables), { roomId: currentRoomId, roundId: currentRoundId })
    expect(result.advanced).toBe(false)
  })
})
