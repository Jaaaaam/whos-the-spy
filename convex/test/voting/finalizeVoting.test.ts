import { describe, expect, it } from 'vitest'
import { GAME_STATUS } from '../../../shared/gameStatus'
import { finalizeVotingHandler } from '../../game/voting'
import {
  createCtx,
  createPlayer,
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
} from '../gameTestUtils'

describe('finalizeVotingHandler', () => {
  it('eliminates the top-voted spy, ends the game when no spies remain', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const spyId = playerId('player_1')
    const civilian1Id = playerId('player_2')
    const civilian2Id = playerId('player_3')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        createPlayer(spyId, currentRoomId),
        createPlayer(civilian1Id, currentRoomId),
        createPlayer(civilian2Id, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, currentRoundId, spyId, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, currentRoundId, civilian1Id, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_3'), currentRoomId, currentRoundId, civilian2Id, 'civilian'),
      ],
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, civilian1Id, spyId),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, civilian2Id, spyId),
        createVote(voteId('vote_3'), currentRoomId, currentRoundId, spyId, civilian1Id),
      ],
    }
    const ctx = createCtx(tables)

    const result = await finalizeVotingHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId })

    expect(result).toEqual({ isTie: false, eliminatedPlayerId: spyId, didSpyWon: false })
    expect(tables.players.find(p => p._id === spyId)?.isEliminated).toBe(true)
    expect(tables.rounds[0]).toMatchObject({ eliminatedPlayerId: spyId, didSpyWon: false, isTie: false })
    expect(tables.rooms[0].status).toBe(GAME_STATUS.RESULTS)
  })

  it('eliminates a spy but continues the game when other spies remain', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const spy1Id = playerId('player_1')
    const spy2Id = playerId('player_2')
    const civilian1Id = playerId('player_3')
    const civilian2Id = playerId('player_4')
    const civilian3Id = playerId('player_5')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        createPlayer(spy1Id, currentRoomId),
        createPlayer(spy2Id, currentRoomId),
        createPlayer(civilian1Id, currentRoomId),
        createPlayer(civilian2Id, currentRoomId),
        createPlayer(civilian3Id, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, currentRoundId, spy1Id, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, currentRoundId, spy2Id, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_3'), currentRoomId, currentRoundId, civilian1Id, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_4'), currentRoomId, currentRoundId, civilian2Id, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_5'), currentRoomId, currentRoundId, civilian3Id, 'civilian'),
      ],
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, spy2Id, spy1Id),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, civilian1Id, spy1Id),
        createVote(voteId('vote_3'), currentRoomId, currentRoundId, civilian2Id, spy1Id),
        createVote(voteId('vote_4'), currentRoomId, currentRoundId, civilian3Id, spy2Id),
        createVote(voteId('vote_5'), currentRoomId, currentRoundId, spy1Id, civilian1Id),
      ],
    }
    const ctx = createCtx(tables)

    const result = await finalizeVotingHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId })

    expect(result).toEqual({ isTie: false, eliminatedPlayerId: spy1Id, didSpyWon: false })
    expect(tables.players.find(p => p._id === spy1Id)?.isEliminated).toBe(true)
    expect(tables.rooms[0].status).toBe(GAME_STATUS.RESULTS)
  })

  it('eliminates a civilian and ends the game when spies equal civilians', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const spyId = playerId('player_1')
    const civilian1Id = playerId('player_2')
    const civilian2Id = playerId('player_3')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        createPlayer(spyId, currentRoomId),
        createPlayer(civilian1Id, currentRoomId),
        createPlayer(civilian2Id, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, currentRoundId, spyId, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, currentRoundId, civilian1Id, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_3'), currentRoomId, currentRoundId, civilian2Id, 'civilian'),
      ],
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, spyId, civilian1Id),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, civilian1Id, civilian2Id),
        createVote(voteId('vote_3'), currentRoomId, currentRoundId, civilian2Id, civilian1Id),
      ],
    }
    const ctx = createCtx(tables)

    // civilian1 gets 2 votes, is eliminated → 1 spy vs 1 civilian → spy wins
    const result = await finalizeVotingHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId })

    expect(result).toEqual({ isTie: false, eliminatedPlayerId: civilian1Id, didSpyWon: true })
    expect(tables.players.find(p => p._id === civilian1Id)?.isEliminated).toBe(true)
    expect(tables.rounds[0]).toMatchObject({ eliminatedPlayerId: civilian1Id, didSpyWon: true, isTie: false })
    expect(tables.rooms[0].status).toBe(GAME_STATUS.RESULTS)
  })

  it('eliminates a civilian but continues the game when civilians still outnumber spies', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const spyId = playerId('player_1')
    const civilian1Id = playerId('player_2')
    const civilian2Id = playerId('player_3')
    const civilian3Id = playerId('player_4')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        createPlayer(spyId, currentRoomId),
        createPlayer(civilian1Id, currentRoomId),
        createPlayer(civilian2Id, currentRoomId),
        createPlayer(civilian3Id, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, currentRoundId, spyId, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, currentRoundId, civilian1Id, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_3'), currentRoomId, currentRoundId, civilian2Id, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_4'), currentRoomId, currentRoundId, civilian3Id, 'civilian'),
      ],
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, spyId, civilian1Id),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, civilian1Id, civilian2Id),
        createVote(voteId('vote_3'), currentRoomId, currentRoundId, civilian2Id, civilian1Id),
        createVote(voteId('vote_4'), currentRoomId, currentRoundId, civilian3Id, civilian1Id),
      ],
    }
    const ctx = createCtx(tables)

    // civilian1 gets 3 votes, eliminated → 1 spy vs 2 civilians → game continues
    const result = await finalizeVotingHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId })

    expect(result).toEqual({ isTie: false, eliminatedPlayerId: civilian1Id, didSpyWon: false })
    expect(tables.rooms[0].status).toBe(GAME_STATUS.RESULTS)
  })

  it('transitions to battle on a tie and stores the tied candidates', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const player1Id = playerId('player_1')
    const player2Id = playerId('player_2')
    const player3Id = playerId('player_3')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        createPlayer(player1Id, currentRoomId),
        createPlayer(player2Id, currentRoomId),
        createPlayer(player3Id, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, currentRoundId, player1Id, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, currentRoundId, player2Id, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_3'), currentRoomId, currentRoundId, player3Id, 'civilian'),
      ],
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, player1Id, player2Id),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, player2Id, player1Id),
        createVote(voteId('vote_3'), currentRoomId, currentRoundId, player3Id, player1Id),
      ],
    }

    // Make it a tie: player1 gets 2 votes, player2 gets 1 vote — not a tie.
    // Adjust: player1 ↔ player2 each get 1 vote, player3 gets 1 vote — three-way tie at 1.
    tables.votes = [
      createVote(voteId('vote_1'), currentRoomId, currentRoundId, player1Id, player2Id),
      createVote(voteId('vote_2'), currentRoomId, currentRoundId, player2Id, player3Id),
      createVote(voteId('vote_3'), currentRoomId, currentRoundId, player3Id, player1Id),
    ]

    const ctx = createCtx(tables)

    const result = await finalizeVotingHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId })

    expect(result).toBeDefined()
    expect(result!.isTie).toBe(true)
    expect(result!.eliminatedPlayerId).toBeUndefined()
    expect(result!.didSpyWon).toBeUndefined()
    expect(tables.rounds[0].isTie).toBe(true)
    expect(tables.rounds[0].tieCandidateIds).toHaveLength(3)
    expect(tables.rooms[0].status).toBe(GAME_STATUS.BATTLE)
    expect(tables.players.every(p => !p.isEliminated)).toBe(true)
  })

  it('finalizes with partial votes — does not require everyone to vote', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const spyId = playerId('player_1')
    const civilianId = playerId('player_2')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        createPlayer(spyId, currentRoomId),
        createPlayer(civilianId, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, currentRoundId, spyId, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, currentRoundId, civilianId, 'civilian'),
      ],
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, civilianId, spyId),
        // spyId has not voted — partial votes should still proceed
      ],
    }
    const ctx = createCtx(tables)

    const result = await finalizeVotingHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId })

    expect(result).toEqual({ isTie: false, eliminatedPlayerId: spyId, didSpyWon: false })
    expect(tables.players.find(p => p._id === spyId)?.isEliminated).toBe(true)
    expect(tables.rooms[0].status).toBe(GAME_STATUS.RESULTS)
  })

  it('skips elimination when zero real votes are cast', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const player1Id = playerId('player_1')
    const player2Id = playerId('player_2')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        createPlayer(player1Id, currentRoomId),
        createPlayer(player2Id, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, currentRoundId, player1Id, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, currentRoundId, player2Id, 'civilian'),
      ],
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, player1Id),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, player2Id),
      ],
    }
    const ctx = createCtx(tables)

    const result = await finalizeVotingHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId })

    expect(result).toEqual({ isTie: false, eliminatedPlayerId: undefined, didSpyWon: undefined })
    expect(tables.rooms[0].status).toBe(GAME_STATUS.RESULTS)
    expect(tables.rounds[0]).toMatchObject({ eliminatedPlayerId: undefined, isTie: false, isGameOver: false })
    expect(tables.players.every(p => !p.isEliminated)).toBe(true)
  })

  it('skips elimination when abstentions outnumber real votes', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const player1Id = playerId('player_1')
    const player2Id = playerId('player_2')
    const player3Id = playerId('player_3')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        createPlayer(player1Id, currentRoomId),
        createPlayer(player2Id, currentRoomId),
        createPlayer(player3Id, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, currentRoundId, player1Id, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, currentRoundId, player2Id, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_3'), currentRoomId, currentRoundId, player3Id, 'civilian'),
      ],
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, player1Id, player2Id), // 1 real vote
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, player2Id),             // abstention
        createVote(voteId('vote_3'), currentRoomId, currentRoundId, player3Id),             // abstention
      ],
    }
    const ctx = createCtx(tables)

    // abstentions (2) > real votes (1) → no elimination
    const result = await finalizeVotingHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId })

    expect(result).toEqual({ isTie: false, eliminatedPlayerId: undefined, didSpyWon: undefined })
    expect(tables.rooms[0].status).toBe(GAME_STATUS.RESULTS)
    expect(tables.rounds[0].eliminatedPlayerId).toBeUndefined()
    expect(tables.players.every(p => !p.isEliminated)).toBe(true)
  })

  it('is idempotent — second call after voting is finalized returns without error', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    const spyId = playerId('player_1')
    const civilian1Id = playerId('player_2')
    const civilian2Id = playerId('player_3')
    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players: [
        createPlayer(spyId, currentRoomId),
        createPlayer(civilian1Id, currentRoomId),
        createPlayer(civilian2Id, currentRoomId),
      ],
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [
        createRoleAssignment(roleAssignmentId('ra_1'), currentRoomId, currentRoundId, spyId, 'spy'),
        createRoleAssignment(roleAssignmentId('ra_2'), currentRoomId, currentRoundId, civilian1Id, 'civilian'),
        createRoleAssignment(roleAssignmentId('ra_3'), currentRoomId, currentRoundId, civilian2Id, 'civilian'),
      ],
      votes: [
        createVote(voteId('vote_1'), currentRoomId, currentRoundId, civilian1Id, spyId),
        createVote(voteId('vote_2'), currentRoomId, currentRoundId, civilian2Id, spyId),
        createVote(voteId('vote_3'), currentRoomId, currentRoundId, spyId, civilian1Id),
      ],
    }
    const ctx = createCtx(tables)

    await finalizeVotingHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId })
    await expect(
      finalizeVotingHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId }),
    ).resolves.toBeUndefined()
    expect(tables.rooms[0].status).toBe(GAME_STATUS.RESULTS)
  })

  it('ends the game when spies equal civilians with 15 players', async () => {
    const currentRoomId = roomId('room_1')
    const currentRoundId = roundId('round_1')
    // 15 players: 5 spies, 10 civilians — eliminate 9 civilians → 5 spies vs 1 civilian → spy wins
    const spyIds = Array.from({ length: 5 }, (_, i) => playerId(`spy_${i + 1}`))
    const civilianIds = Array.from({ length: 10 }, (_, i) => playerId(`civilian_${i + 1}`))
    // Mark 9 civilians as already eliminated (previous rounds), leaving 5 spies + 1 civilian active
    const players = [
      ...spyIds.map(id => createPlayer(id, currentRoomId)),
      ...civilianIds.map((id, i) => ({ ...createPlayer(id, currentRoomId), isEliminated: i < 9 })),
    ]
    const activePlayers = players.filter(p => !p.isEliminated) // 5 spies + 1 civilian = 6 active
    const lastCivilianId = civilianIds[9]

    const tables: StoredTables = {
      rooms: [createRoomWithStatus(currentRoomId, GAME_STATUS.VOTING, currentRoundId)],
      players,
      rounds: [createRound(currentRoundId, currentRoomId)],
      roleAssignments: [
        ...spyIds.map((id, i) =>
          createRoleAssignment(roleAssignmentId(`ra_spy_${i + 1}`), currentRoomId, currentRoundId, id, 'spy')),
        ...civilianIds.map((id, i) =>
          createRoleAssignment(roleAssignmentId(`ra_civ_${i + 1}`), currentRoomId, currentRoundId, id, 'civilian')),
      ],
      // All 6 active players vote for the last civilian
      votes: activePlayers.map((voter, i) =>
        createVote(
          voteId(`vote_${i + 1}`),
          currentRoomId,
          currentRoundId,
          playerId(voter._id),
          voter._id === lastCivilianId ? spyIds[0] : lastCivilianId,
        )
      ),
    }
    const ctx = createCtx(tables)

    // last civilian gets 5 votes (from 5 spies), spy gets 1 vote (from last civilian) → civilian eliminated
    // 5 spies >= 0 remaining civilians → spy wins
    const result = await finalizeVotingHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId })

    expect(result).toEqual({ isTie: false, eliminatedPlayerId: lastCivilianId, didSpyWon: true })
    expect(tables.rooms[0].status).toBe(GAME_STATUS.RESULTS)
  })

  it('is a no-op when the room is not in the voting phase', async () => {
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
      finalizeVotingHandler(ctx, { roomId: currentRoomId, roundId: currentRoundId }),
    ).resolves.toBeUndefined()
    expect(tables.rooms[0].status).toBe(GAME_STATUS.DISCUSSION)
  })
})
