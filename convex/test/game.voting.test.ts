import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GAME_STATUS } from '../../shared/gameStatus'
import {
  castVoteHandler,
  finalizeVotingHandler,
  getVoteProgressHandler,
  getVotingResultsHandler,
} from '../game/voting'
import { GAME_ERROR } from '../game/errors'
import {
  createCtx,
  createPlayer,
  createRoom,
  createRoleAssignment,
  createRoomWithStatus,
  createRound,
  createVote,
  playerId,
  roleAssignmentId,
  roomId,
  roundId,
  type StoredTables,
  voteId,
} from './gameTestUtils'

describe('castVoteHandler', () => {
  const currentRoomId = roomId('room_1')
  const currentRoundId = roundId('round_1')
  const voterId = playerId('player_1')
  const targetId = playerId('player_2')

  function baseTables(overrides: Partial<StoredTables> = {}): StoredTables {
    return {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        createPlayer(voterId, currentRoomId, true),
        createPlayer(targetId, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [],
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates a vote during the voting phase', async () => {
    const tables = baseTables()
    const ctx = createCtx(tables)

    const result = await castVoteHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: voterId,
      targetPlayerId: targetId,
    })

    expect(result).toEqual({
      vote: voteId('vote_1'),
      isUpdated: false,
    })
    expect(tables.votes).toHaveLength(1)
    expect(tables.votes?.[0]).toMatchObject({
      _id: voteId('vote_1'),
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: voterId,
      targetPlayerId: targetId,
      createdAt: 1_000,
      updatedAt: 1_000,
    })
  })

  it('updates an existing vote for the same voter and round', async () => {
    const firstTargetId = playerId('player_2')
    const nextTargetId = playerId('player_3')
    const existingVote = {
      ...createVote(voteId('vote_1'), currentRoomId, currentRoundId, voterId, firstTargetId),
      createdAt: 500,
      updatedAt: 500,
    }
    const tables = baseTables({
      players: [
        createPlayer(voterId, currentRoomId, true),
        createPlayer(firstTargetId, currentRoomId),
        createPlayer(nextTargetId, currentRoomId),
      ],
      votes: [existingVote],
    })
    const ctx = createCtx(tables)

    const result = await castVoteHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: voterId,
      targetPlayerId: nextTargetId,
    })

    expect(result).toEqual({
      vote: voteId('vote_1'),
      isUpdated: true,
    })
    expect(tables.votes).toHaveLength(1)
    expect(tables.votes?.[0]).toMatchObject({
      targetPlayerId: nextTargetId,
      createdAt: 500,
      updatedAt: 1_000,
    })
  })

  it('rejects voting outside the voting phase', async () => {
    const tables = baseTables({
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.DISCUSSION, currentRoundId)],
    })
    const ctx = createCtx(tables)

    await expect(
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        voterPlayerId: voterId,
        targetPlayerId: targetId,
      }),
    ).rejects.toThrow(GAME_ERROR.ROOM_NOT_IN_CURRENT_VOTING)
    expect(tables.votes).toHaveLength(0)
  })

  it('rejects voting for a stale round', async () => {
    const staleRoundId = roundId('round_2')
    const tables = baseTables({
      rounds: [
        createRound(currentRoundId, currentRoomId),
        createRound(staleRoundId, currentRoomId),
      ],
    })
    const ctx = createCtx(tables)

    await expect(
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: staleRoundId,
        voterPlayerId: voterId,
        targetPlayerId: targetId,
      }),
    ).rejects.toThrow(GAME_ERROR.NOT_CURRENT_ROOM_ROUND)
  })

  it('rejects a missing round', async () => {
    const tables = baseTables({ rounds: [] })
    const ctx = createCtx(tables)

    await expect(
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        voterPlayerId: voterId,
        targetPlayerId: targetId,
      }),
    ).rejects.toThrow(GAME_ERROR.ROUND_NOT_FOUND)
  })

  it('rejects a voter outside the room', async () => {
    const otherRoomId = roomId('room_2')
    const tables = baseTables({
      rooms: [
        createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId),
        createRoom(otherRoomId),
      ],
      players: [
        createPlayer(voterId, otherRoomId),
        createPlayer(targetId, currentRoomId),
      ],
    })
    const ctx = createCtx(tables)

    await expect(
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        voterPlayerId: voterId,
        targetPlayerId: targetId,
      }),
    ).rejects.toThrow(GAME_ERROR.VOTER_NOT_IN_ROOM)
  })

  it('rejects a disconnected voter', async () => {
    const tables = baseTables({
      players: [
        { ...createPlayer(voterId, currentRoomId, true), isConnected: false },
        createPlayer(targetId, currentRoomId),
      ],
    })
    const ctx = createCtx(tables)

    await expect(
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        voterPlayerId: voterId,
        targetPlayerId: targetId,
      }),
    ).rejects.toThrow(GAME_ERROR.VOTER_NOT_IN_ROOM)
  })

  it('rejects a target outside the room', async () => {
    const otherRoomId = roomId('room_2')
    const tables = baseTables({
      rooms: [
        createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId),
        createRoom(otherRoomId),
      ],
      players: [
        createPlayer(voterId, currentRoomId, true),
        createPlayer(targetId, otherRoomId),
      ],
    })
    const ctx = createCtx(tables)

    await expect(
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        voterPlayerId: voterId,
        targetPlayerId: targetId,
      }),
    ).rejects.toThrow(GAME_ERROR.TARGET_NOT_IN_ROOM)
  })

  it('rejects a disconnected target', async () => {
    const tables = baseTables({
      players: [
        createPlayer(voterId, currentRoomId, true),
        { ...createPlayer(targetId, currentRoomId), isConnected: false },
      ],
    })
    const ctx = createCtx(tables)

    await expect(
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        voterPlayerId: voterId,
        targetPlayerId: targetId,
      }),
    ).rejects.toThrow(GAME_ERROR.TARGET_NOT_IN_ROOM)
  })

  it('rejects self-votes', async () => {
    const tables = baseTables({ players: [createPlayer(voterId, currentRoomId, true)] })
    const ctx = createCtx(tables)

    await expect(
      castVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        voterPlayerId: voterId,
        targetPlayerId: voterId,
      }),
    ).rejects.toThrow(GAME_ERROR.CANNOT_VOTE_SELF)
  })
})

describe('getVoteProgressHandler', () => {
  it('counts only connected players as eligible voters', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const voterId = playerId('player_1')
    const targetId = playerId('player_2')
    const disconnectedPlayerId = playerId('player_3')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        createPlayer(voterId, currentRoomId, true),
        createPlayer(targetId, currentRoomId),
        {
          ...createPlayer(disconnectedPlayerId, currentRoomId),
          isConnected: false,
        },
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [
        createVote(
          voteId('vote_1'),
          currentRoomId,
          currentRoundId,
          voterId,
          targetId,
        ),
        createVote(
          voteId('vote_2'),
          currentRoomId,
          currentRoundId,
          disconnectedPlayerId,
          targetId,
        ),
      ],
    }
    const ctx = createCtx(tables)

    const progress = await getVoteProgressHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(progress).toEqual({
      votedCount: 1,
      eligibleVoterCount: 2,
      isComplete: false,
      selectedTargetPlayerId: null,
    })
  })

  it('marks voting complete when every connected player has voted', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const firstVoterId = playerId('player_1')
    const secondVoterId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        createPlayer(firstVoterId, currentRoomId, true),
        createPlayer(secondVoterId, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [
        createVote(
          voteId('vote_1'),
          currentRoomId,
          currentRoundId,
          firstVoterId,
          secondVoterId,
        ),
        createVote(
          voteId('vote_2'),
          currentRoomId,
          currentRoundId,
          secondVoterId,
          firstVoterId,
        ),
      ],
    }
    const ctx = createCtx(tables)

    const progress = await getVoteProgressHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(progress).toEqual({
      votedCount: 2,
      eligibleVoterCount: 2,
      isComplete: true,
      selectedTargetPlayerId: null,
    })
  })

  it('returns the current voter selected target', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const voterId = playerId('player_1')
    const targetId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        createPlayer(voterId, currentRoomId, true),
        createPlayer(targetId, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [
        createVote(
          voteId('vote_1'),
          currentRoomId,
          currentRoundId,
          voterId,
          targetId,
        ),
      ],
    }
    const ctx = createCtx(tables)

    const progress = await getVoteProgressHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: voterId,
    })

    expect(progress).toEqual({
      votedCount: 1,
      eligibleVoterCount: 2,
      isComplete: false,
      selectedTargetPlayerId: targetId,
    })
  })

  it('does not return a selected target for inactive voter or target records', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const voterId = playerId('player_1')
    const targetId = playerId('player_2')
    const disconnectedVoterId = playerId('player_3')
    const disconnectedTargetId = playerId('player_4')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        createPlayer(voterId, currentRoomId, true),
        createPlayer(targetId, currentRoomId),
        {
          ...createPlayer(disconnectedVoterId, currentRoomId),
          isConnected: false,
        },
        {
          ...createPlayer(disconnectedTargetId, currentRoomId),
          isConnected: false,
        },
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [
        createVote(
          voteId('vote_1'),
          currentRoomId,
          currentRoundId,
          voterId,
          disconnectedTargetId,
        ),
        createVote(
          voteId('vote_2'),
          currentRoomId,
          currentRoundId,
          disconnectedVoterId,
          targetId,
        ),
      ],
    }
    const ctx = createCtx(tables)

    const activeVoterProgress = await getVoteProgressHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: voterId,
    })
    const inactiveVoterProgress = await getVoteProgressHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: disconnectedVoterId,
    })

    expect(activeVoterProgress).toEqual({
      votedCount: 0,
      eligibleVoterCount: 2,
      isComplete: false,
      selectedTargetPlayerId: null,
    })
    expect(inactiveVoterProgress).toEqual({
      votedCount: 0,
      eligibleVoterCount: 2,
      isComplete: false,
      selectedTargetPlayerId: null,
    })
  })
})

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
        {
          ...createPlayer(firstPlayerId, currentRoomId, true),
          name: 'Jam',
        },
        {
          ...createPlayer(secondPlayerId, currentRoomId),
          name: 'Mika',
        },
        {
          ...createPlayer(thirdPlayerId, currentRoomId),
          name: 'Alex',
        },
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [
        createVote(
          voteId('vote_1'),
          currentRoomId,
          currentRoundId,
          firstPlayerId,
          secondPlayerId,
        ),
        createVote(
          voteId('vote_2'),
          currentRoomId,
          currentRoundId,
          secondPlayerId,
          firstPlayerId,
        ),
        createVote(
          voteId('vote_3'),
          currentRoomId,
          currentRoundId,
          thirdPlayerId,
          secondPlayerId,
        ),
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
        {
          playerId: secondPlayerId,
          playerName: 'Mika',
          voteCount: 2,
        },
        {
          playerId: firstPlayerId,
          playerName: 'Jam',
          voteCount: 1,
        },
        {
          playerId: thirdPlayerId,
          playerName: 'Alex',
          voteCount: 0,
        },
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
        {
          ...createPlayer(firstPlayerId, currentRoomId, true),
          name: 'Jam',
        },
        {
          ...createPlayer(secondPlayerId, currentRoomId),
          name: 'Mika',
        },
        {
          ...createPlayer(disconnectedPlayerId, currentRoomId),
          isConnected: false,
          name: 'Alex',
        },
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [
        createVote(
          voteId('vote_1'),
          currentRoomId,
          currentRoundId,
          firstPlayerId,
          secondPlayerId,
        ),
        createVote(
          voteId('vote_2'),
          currentRoomId,
          currentRoundId,
          disconnectedPlayerId,
          secondPlayerId,
        ),
        createVote(
          voteId('vote_3'),
          currentRoomId,
          currentRoundId,
          secondPlayerId,
          disconnectedPlayerId,
        ),
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
        {
          playerId: secondPlayerId,
          playerName: 'Mika',
          voteCount: 1,
        },
        {
          playerId: firstPlayerId,
          playerName: 'Jam',
          voteCount: 0,
        },
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
      // 14 players vote for player_1; player_1 votes for player_2
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

describe('finalizeVotingHandler', () => {
  const currentRoomId = roomId('room_1')
  const currentRoundId = roundId('round_1')
  const spyId = playerId('spy_player')
  const civilian1Id = playerId('civilian_1')
  const civilian2Id = playerId('civilian_2')

  function baseTablesWithRoleAssignments(overrides: Partial<StoredTables> = {}): StoredTables {
    return {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        { ...createPlayer(spyId, currentRoomId), name: 'Mika' },
        { ...createPlayer(civilian1Id, currentRoomId), name: 'Jam' },
        { ...createPlayer(civilian2Id, currentRoomId), name: 'Dani' },
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, currentRoundId, spyId, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, currentRoundId, civilian1Id, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_3'), currentRoomId, currentRoundId, civilian2Id, 'civilian'),
      ],
      votes: [],
      ...overrides,
    }
  }

  it('sets room status to RESULTS and isGameOver=true when spy is caught', async () => {
    const tables = baseTablesWithRoleAssignments({
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, civilian1Id, spyId),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, civilian2Id, spyId),
        createVote(voteId('vote_3'), currentRoomId, currentRoundId, spyId, civilian1Id),
      ],
    })
    const ctx = createCtx(tables)

    const result = await finalizeVotingHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId })

    expect(result.isTie).toBe(false)
    expect(result.eliminatedPlayerId).toBe(spyId)
    expect(result.didSpyWon).toBe(false)
    expect(tables.rooms[0].status).toBe(GAME_STATUS.RESULTS)
    const round = tables.rounds[0] as any
    expect(round.isGameOver).toBe(true)
  })

  it('sets room status to RESULTS and isGameOver=false when civilian is eliminated (game continues)', async () => {
    const extraCivilianId = playerId('civilian_3')
    const tables = baseTablesWithRoleAssignments({
      players: [
        { ...createPlayer(spyId, currentRoomId), name: 'Mika' },
        { ...createPlayer(civilian1Id, currentRoomId), name: 'Jam' },
        { ...createPlayer(civilian2Id, currentRoomId), name: 'Dani' },
        { ...createPlayer(extraCivilianId, currentRoomId), name: 'Alex' },
      ],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, currentRoundId, spyId, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, currentRoundId, civilian1Id, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_3'), currentRoomId, currentRoundId, civilian2Id, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_4'), currentRoomId, currentRoundId, extraCivilianId, 'civilian'),
      ],
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, spyId, civilian1Id),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, civilian2Id, civilian1Id),
        createVote(voteId('vote_3'), currentRoomId, currentRoundId, extraCivilianId, civilian1Id),
        createVote(voteId('vote_4'), currentRoomId, currentRoundId, civilian1Id, spyId),
      ],
    })
    const ctx = createCtx(tables)

    const result = await finalizeVotingHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId })

    expect(result.isTie).toBe(false)
    expect(result.eliminatedPlayerId).toBe(civilian1Id)
    expect(result.didSpyWon).toBe(false)
    expect(tables.rooms[0].status).toBe(GAME_STATUS.RESULTS)
    const round = tables.rounds[0] as any
    expect(round.isGameOver).toBe(false)
  })

  it('sets room status to RESULTS and isGameOver=true when spies outnumber civilians', async () => {
    const tables = baseTablesWithRoleAssignments({
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, spyId, civilian1Id),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, civilian2Id, civilian1Id),
        createVote(voteId('vote_3'), currentRoomId, currentRoundId, civilian1Id, spyId),
      ],
    })
    const ctx = createCtx(tables)

    const result = await finalizeVotingHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId })

    expect(result.isTie).toBe(false)
    expect(result.eliminatedPlayerId).toBe(civilian1Id)
    expect(result.didSpyWon).toBe(true)
    expect(tables.rooms[0].status).toBe(GAME_STATUS.RESULTS)
    const round = tables.rounds[0] as any
    expect(round.isGameOver).toBe(true)
  })
})
