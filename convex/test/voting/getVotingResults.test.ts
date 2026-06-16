import { describe, expect, it } from 'vitest'
import { GAME_STATUS } from '../../../shared/gameStatus'
import { getVotingResultsHandler } from '../../game/voting'
import { GAME_ERROR } from '../../game/errors'
import {
  createCtx,
  createPlayer,
  createRoomWithStatus,
  createRound,
  createVote,
  playerId,
  roomId,
  roundId,
  type StoredTables,
  voteId,
} from '../gameTestUtils'

describe('getVotingResultsHandler', () => {
  it('groups vote counts by active target and includes players with zero votes', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const firstPlayerId = playerId('player_1')
    const secondPlayerId = playerId('player_2')
    const thirdPlayerId = playerId('player_3')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        { ...createPlayer(firstPlayerId, currentRoomId, true), name: 'Jam' },
        { ...createPlayer(secondPlayerId, currentRoomId), name: 'Mika' },
        { ...createPlayer(thirdPlayerId, currentRoomId), name: 'Alex' },
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, firstPlayerId, secondPlayerId),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, secondPlayerId, firstPlayerId),
        createVote(voteId('vote_3'), currentRoomId, currentRoundId, thirdPlayerId, secondPlayerId),
      ],
    }
    const ctx = createCtx(tables)

    const results = await getVotingResultsHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(results).toEqual({
      totalVotes: 3,
      results: [
        { playerId: secondPlayerId, playerName: 'Mika', voteCount: 2 },
        { playerId: firstPlayerId, playerName: 'Jam', voteCount: 1 },
        { playerId: thirdPlayerId, playerName: 'Alex', voteCount: 0 },
      ],
    })
  })

  it('ignores votes from disconnected voters and votes targeting disconnected players', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const firstPlayerId = playerId('player_1')
    const secondPlayerId = playerId('player_2')
    const disconnectedPlayerId = playerId('player_3')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        { ...createPlayer(firstPlayerId, currentRoomId, true), name: 'Jam' },
        { ...createPlayer(secondPlayerId, currentRoomId), name: 'Mika' },
        { ...createPlayer(disconnectedPlayerId, currentRoomId), isConnected: false, name: 'Alex' },
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, firstPlayerId, secondPlayerId),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, disconnectedPlayerId, secondPlayerId),
        createVote(voteId('vote_3'), currentRoomId, currentRoundId, secondPlayerId, disconnectedPlayerId),
      ],
    }
    const ctx = createCtx(tables)

    const results = await getVotingResultsHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(results).toEqual({
      totalVotes: 1,
      results: [
        { playerId: secondPlayerId, playerName: 'Mika', voteCount: 1 },
        { playerId: firstPlayerId, playerName: 'Jam', voteCount: 0 },
      ],
    })
  })

  it('tallies votes correctly across 15 players', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const playerIds = Array.from({ length: 15 }, (_, i) => playerId(`player_${i + 1}`))
    const targetId = playerIds[0]
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: playerIds.map((id, i) => ({ ...createPlayer(id, currentRoomId, i === 0), name: `Player ${i + 1}` })),
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [
        ...playerIds.slice(1).map((id, i) =>
          createVote(voteId(`vote_${i + 1}`), currentRoomId, currentRoundId, id, targetId),
        ),
        createVote(voteId('vote_15'), currentRoomId, currentRoundId, targetId, playerIds[1]),
      ],
    }
    const ctx = createCtx(tables)

    const results = await getVotingResultsHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId })

    expect(results.totalVotes).toBe(15)
    expect(results.results[0]).toMatchObject({ playerId: targetId, voteCount: 14 })
    expect(results.results[1]).toMatchObject({ playerId: playerIds[1], voteCount: 1 })
    expect(results.results.slice(2).every(r => r.voteCount === 0)).toBe(true)
  })

  it('rejects requests outside the voting phase', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.DISCUSSION, currentRoundId)],
      players: [],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [],
    }
    const ctx = createCtx(tables)

    await expect(
      getVotingResultsHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
      }),
    ).rejects.toThrow(GAME_ERROR.ROOM_NOT_IN_CURRENT_VOTING)
  })
})
