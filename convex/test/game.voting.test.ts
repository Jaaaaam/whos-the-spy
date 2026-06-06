import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GAME_STATUS } from '../../shared/gameStatus'
import {
  castVoteHandler,
  getVoteProgressHandler,
  getVotingResultsHandler,
} from '../game/voting'
import { GAME_ERROR } from '../game/errors'
import {
  createCtx,
  createPlayer,
  createRoom,
  createRound,
  createVote,
  playerId,
  roomId,
  roundId,
  type StoredTables,
  voteId,
} from './gameTestUtils'

describe('castVoteHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates a vote during the voting phase', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const voterId = playerId('player_1')
    const targetId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.VOTING,
          currentRoundId,
        },
      ],
      players: [
        createPlayer(voterId, currentRoomId, true),
        createPlayer(targetId, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [],
    }
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
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const voterId = playerId('player_1')
    const firstTargetId = playerId('player_2')
    const nextTargetId = playerId('player_3')
    const existingVote = {
      ...createVote(
        voteId('vote_1'),
        currentRoomId,
        currentRoundId,
        voterId,
        firstTargetId,
      ),
      createdAt: 500,
      updatedAt: 500,
    }
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.VOTING,
          currentRoundId,
        },
      ],
      players: [
        createPlayer(voterId, currentRoomId, true),
        createPlayer(firstTargetId, currentRoomId),
        createPlayer(nextTargetId, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [existingVote],
    }
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
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const voterId = playerId('player_1')
    const targetId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.DISCUSSION,
          currentRoundId,
        },
      ],
      players: [
        createPlayer(voterId, currentRoomId, true),
        createPlayer(targetId, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [],
    }
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
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const staleRoundId = roundId('round_2')
    const voterId = playerId('player_1')
    const targetId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.VOTING,
          currentRoundId,
        },
      ],
      players: [
        createPlayer(voterId, currentRoomId, true),
        createPlayer(targetId, currentRoomId),
      ],
      rounds: [
        createRound(currentRoundId, currentRoomId),
        createRound(staleRoundId, currentRoomId),
      ],
      roleAssignments: [],
      votes: [],
    }
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
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const voterId = playerId('player_1')
    const targetId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.VOTING,
          currentRoundId,
        },
      ],
      players: [
        createPlayer(voterId, currentRoomId, true),
        createPlayer(targetId, currentRoomId),
      ],
      rounds: [],
      roleAssignments: [],
      votes: [],
    }
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
    const currentRoomId = roomId('room_1')
    const otherRoomId = roomId('room_2')
    const currentRoundId = roundId('round_1')
    const voterId = playerId('player_1')
    const targetId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.VOTING,
          currentRoundId,
        },
        createRoom(otherRoomId),
      ],
      players: [
        createPlayer(voterId, otherRoomId),
        createPlayer(targetId, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [],
    }
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
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const voterId = playerId('player_1')
    const targetId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.VOTING,
          currentRoundId,
        },
      ],
      players: [
        {
          ...createPlayer(voterId, currentRoomId, true),
          isConnected: false,
        },
        createPlayer(targetId, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [],
    }
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
    const currentRoomId = roomId('room_1')
    const otherRoomId = roomId('room_2')
    const currentRoundId = roundId('round_1')
    const voterId = playerId('player_1')
    const targetId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.VOTING,
          currentRoundId,
        },
        createRoom(otherRoomId),
      ],
      players: [
        createPlayer(voterId, currentRoomId, true),
        createPlayer(targetId, otherRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [],
    }
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
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const voterId = playerId('player_1')
    const targetId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.VOTING,
          currentRoundId,
        },
      ],
      players: [
        createPlayer(voterId, currentRoomId, true),
        {
          ...createPlayer(targetId, currentRoomId),
          isConnected: false,
        },
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [],
    }
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
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const voterId = playerId('player_1')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.VOTING,
          currentRoundId,
        },
      ],
      players: [createPlayer(voterId, currentRoomId, true)],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [],
    }
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
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.VOTING,
          currentRoundId,
        },
      ],
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
    })
  })

  it('marks voting complete when every connected player has voted', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const firstVoterId = playerId('player_1')
    const secondVoterId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.VOTING,
          currentRoundId,
        },
      ],
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
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.VOTING,
          currentRoundId,
        },
      ],
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
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.VOTING,
          currentRoundId,
        },
      ],
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

  it('rejects requests outside the voting phase', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const tables: StoredTables = {
      rooms: [
        {
          ...createRoom(currentRoomId),
          status: GAME_STATUS.DISCUSSION,
          currentRoundId,
        },
      ],
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
