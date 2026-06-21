import { describe, expect, it } from 'vitest'
import { GAME_STATUS } from '../../../shared/gameStatus'
import { getVoteProgressHandler } from '../../game/voting'
import {
  createCtx,
  createPlayer,
  createRoomWithStatus,
  createRound,
  createRunoffVotingRound,
  createVote,
  createVotingRound,
  playerId,
  roomId,
  roundId,
  type StoredTables,
  voteId,
} from '../gameTestUtils'

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
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, voterId, targetId),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, disconnectedPlayerId, targetId),
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
      votingEndsAt: null,
      hasVoted: false,
      tieCandidateIds: null,
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
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, firstVoterId, secondVoterId),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, secondVoterId, firstVoterId),
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
      votingEndsAt: null,
      hasVoted: false,
      tieCandidateIds: null,
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
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, voterId, targetId),
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
      votingEndsAt: null,
      hasVoted: true,
      tieCandidateIds: null,
    })
  })

  it('returns null when the room does not exist', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const tables: StoredTables = {
      rooms: [],
      players: [],
      rounds: [],
      roleAssignments: [],
      votes: [],
    }
    const ctx = createCtx(tables)

    const progress = await getVoteProgressHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(progress).toBeNull()
  })

  it('returns null when the room is not in voting status', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.RESULTS, currentRoundId)],
      players: [],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [],
    }
    const ctx = createCtx(tables)

    const progress = await getVoteProgressHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(progress).toBeNull()
  })

  it('returns null when the roundId does not match the current round', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const staleRoundId = roundId('round_0')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [],
    }
    const ctx = createCtx(tables)

    const progress = await getVoteProgressHandler(ctx, {
      roomId: currentRoomId,
      roundId: staleRoundId,
    })

    expect(progress).toBeNull()
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
        { ...createPlayer(disconnectedVoterId, currentRoomId), isConnected: false },
        { ...createPlayer(disconnectedTargetId, currentRoomId), isConnected: false },
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [],
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, voterId, disconnectedTargetId),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, disconnectedVoterId, targetId),
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
      votingEndsAt: null,
      hasVoted: true,
      tieCandidateIds: null,
    })
    expect(inactiveVoterProgress).toEqual({
      votedCount: 0,
      eligibleVoterCount: 2,
      isComplete: false,
      selectedTargetPlayerId: null,
      votingEndsAt: null,
      hasVoted: true,
      tieCandidateIds: null,
    })
  })

  it('returns votingEndsAt from the round when set', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const voterId = playerId('player_1')
    const targetId = playerId('player_2')
    const endsAt = 99_000
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        createPlayer(voterId, currentRoomId, true),
        createPlayer(targetId, currentRoomId),
      ],
      rounds: [createVotingRound(currentRoundId, currentRoomId, endsAt)],
      roleAssignments: [],
      votes: [],
    }
    const ctx = createCtx(tables)

    const progress = await getVoteProgressHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(progress?.votingEndsAt).toBe(endsAt)
  })

  it('returns hasVoted true when the voter has cast a vote', async () => {
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
      votes: [createVote(voteId('vote_1'), currentRoomId, currentRoundId, voterId, targetId)],
    }
    const ctx = createCtx(tables)

    const progress = await getVoteProgressHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: voterId,
    })

    expect(progress?.hasVoted).toBe(true)
  })

  it('returns hasVoted false when the voter has not cast a vote', async () => {
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
      votes: [],
    }
    const ctx = createCtx(tables)

    const progress = await getVoteProgressHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: voterId,
    })

    expect(progress?.hasVoted).toBe(false)
  })

  it('returns hasVoted true when the voter has abstained (no targetPlayerId)', async () => {
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
      votes: [createVote(voteId('vote_1'), currentRoomId, currentRoundId, voterId)],
    }
    const ctx = createCtx(tables)

    const progress = await getVoteProgressHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: voterId,
    })

    expect(progress?.hasVoted).toBe(true)
  })

  it('counts abstentions toward votedCount', async () => {
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
      votes: [createVote(voteId('vote_1'), currentRoomId, currentRoundId, voterId)],
    }
    const ctx = createCtx(tables)

    const progress = await getVoteProgressHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(progress?.votedCount).toBe(1)
    expect(progress?.selectedTargetPlayerId).toBeNull()
  })

  describe('runoff (tieCandidateIds set)', () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const candidate1 = playerId('player_1')
    const candidate2 = playerId('player_2')
    const juror1 = playerId('player_3')
    const juror2 = playerId('player_4')

    it('excludes tied candidates from eligibleVoterCount', async () => {
      const tables: StoredTables = {
        rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
        players: [
          createPlayer(candidate1, currentRoomId),
          createPlayer(candidate2, currentRoomId),
          createPlayer(juror1, currentRoomId),
          createPlayer(juror2, currentRoomId),
        ],
        rounds: [createRunoffVotingRound(currentRoundId, currentRoomId, { tieCandidateIds: [candidate1, candidate2] })],
        roleAssignments: [],
        votes: [],
      }
      const ctx = createCtx(tables)

      const progress = await getVoteProgressHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
      })

      // 4 active players, but the 2 tied candidates are not eligible voters
      expect(progress?.eligibleVoterCount).toBe(2)
      expect(progress?.isComplete).toBe(false)
    })

    it('marks complete when every non-tied player has voted', async () => {
      const tables: StoredTables = {
        rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
        players: [
          createPlayer(candidate1, currentRoomId),
          createPlayer(candidate2, currentRoomId),
          createPlayer(juror1, currentRoomId),
          createPlayer(juror2, currentRoomId),
        ],
        rounds: [createRunoffVotingRound(currentRoundId, currentRoomId, { tieCandidateIds: [candidate1, candidate2] })],
        roleAssignments: [],
        votes: [
          createVote(voteId('vote_1'), currentRoomId, currentRoundId, juror1, candidate1),
          createVote(voteId('vote_2'), currentRoomId, currentRoundId, juror2, candidate2),
        ],
      }
      const ctx = createCtx(tables)

      const progress = await getVoteProgressHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
      })

      expect(progress?.votedCount).toBe(2)
      expect(progress?.eligibleVoterCount).toBe(2)
      expect(progress?.isComplete).toBe(true)
    })

    it('reports complete when no eligible voters remain (all active players are tied candidates)', async () => {
      const tables: StoredTables = {
        rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
        players: [
          createPlayer(candidate1, currentRoomId),
          createPlayer(candidate2, currentRoomId),
        ],
        rounds: [createRunoffVotingRound(currentRoundId, currentRoomId, { tieCandidateIds: [candidate1, candidate2] })],
        roleAssignments: [],
        votes: [],
      }
      const ctx = createCtx(tables)

      const progress = await getVoteProgressHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
      })

      expect(progress?.eligibleVoterCount).toBe(0)
      expect(progress?.isComplete).toBe(true)
    })
  })

  describe('tieCandidateIds field', () => {
    it('returns null when round has no tieCandidateIds', async () => {
      const currentRoomId = roomId('room_1')
      const currentRoundId = roundId('round_1')
      const tables: StoredTables = {
        rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
        players: [
          createPlayer(playerId('player_1'), currentRoomId, true),
          createPlayer(playerId('player_2'), currentRoomId),
        ],
        rounds: [createRound(currentRoundId, currentRoomId)],
        roleAssignments: [],
        votes: [],
      }
      const ctx = createCtx(tables)

      const progress = await getVoteProgressHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
      })

      expect(progress?.tieCandidateIds).toBeNull()
    })

    it('returns the tieCandidateIds array during a runoff', async () => {
      const currentRoomId = roomId('room_1')
      const currentRoundId = roundId('round_1')
      const candidate1 = playerId('player_1')
      const candidate2 = playerId('player_2')
      const tables: StoredTables = {
        rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
        players: [
          createPlayer(candidate1, currentRoomId),
          createPlayer(candidate2, currentRoomId),
        ],
        rounds: [createRunoffVotingRound(currentRoundId, currentRoomId, {
          tieCandidateIds: [candidate1, candidate2],
        })],
        roleAssignments: [],
        votes: [],
      }
      const ctx = createCtx(tables)

      const progress = await getVoteProgressHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
      })

      expect(progress?.tieCandidateIds).toEqual([candidate1, candidate2])
    })
  })
})
