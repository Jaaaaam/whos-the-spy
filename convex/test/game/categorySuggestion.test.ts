import { describe, expect, it, vi } from 'vitest'
import { GAME_STATUS } from '../../../shared/gameStatus'
import {
  advanceCategorySuggestionIfExpiredHandler,
  getCategorySuggestionStateHandler,
  submitCategorySuggestionHandler,
} from '../../game/categorySuggestion'
import { GAME_ERROR } from '../../game/errors'
import {
  categorySuggestionId,
  createCategorySuggestion,
  createCtx,
  createPlayer,
  createRoomWithStatus,
  createWordlessRound,
  playerId,
  roomId,
  roundId,
  type StoredTables,
} from '../gameTestUtils'

const currentRoomId = roomId('room_1')
const currentRoundId = roundId('round_1')

function makeTables(overrides: Partial<StoredTables> = {}): StoredTables {
  return {
    rooms: [{
      ...createRoomWithStatus(currentRoomId, GAME_STATUS.CATEGORY_SUGGESTION, currentRoundId),
      mode: 'wordless_spy',
    }],
    players: [
      createPlayer(playerId('player_1'), currentRoomId, true),
      createPlayer(playerId('player_2'), currentRoomId),
      createPlayer(playerId('player_3'), currentRoomId),
    ],
    rounds: [createWordlessRound(currentRoundId, currentRoomId, { suggestionEndsAt: Date.now() + 45_000 })],
    roleAssignments: [],
    categorySuggestions: [],
    categoryVotes: [],
    wordSubmissions: [],
    ...overrides,
  }
}

// NOTE: the empty arrays are required — createCtx copies its input, so assertions on
// `tables.categorySuggestions` only see inserts when the test provided the array itself.

describe('submitCategorySuggestionHandler', () => {
  it('stores a trimmed suggestion for the player', async () => {
    const tables = makeTables()
    const ctx = createCtx(tables)

    const result = await submitCategorySuggestionHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      playerId: playerId('player_1'),
      text: '  Animals  ',
    })

    expect(result.isUpdated).toBe(false)
    expect(tables.categorySuggestions).toHaveLength(1)
    expect(tables.categorySuggestions![0].text).toBe('Animals')
  })

  it('updates an existing suggestion instead of duplicating it', async () => {
    const tables = makeTables({
      categorySuggestions: [
        createCategorySuggestion(categorySuggestionId('cs_1'), currentRoomId, currentRoundId, playerId('player_1'), 'Animals'),
      ],
    })
    const ctx = createCtx(tables)

    const result = await submitCategorySuggestionHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      playerId: playerId('player_1'),
      text: 'Movies',
    })

    expect(result.isUpdated).toBe(true)
    expect(tables.categorySuggestions).toHaveLength(1)
    expect(tables.categorySuggestions![0].text).toBe('Movies')
  })

  it('rejects empty suggestions', async () => {
    const ctx = createCtx(makeTables())

    await expect(
      submitCategorySuggestionHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        playerId: playerId('player_1'),
        text: '   ',
      }),
    ).rejects.toThrow(GAME_ERROR.EMPTY_SUBMISSION)
  })

  it('advances to category voting once every active player has suggested', async () => {
    const tables = makeTables({
      categorySuggestions: [
        createCategorySuggestion(categorySuggestionId('cs_1'), currentRoomId, currentRoundId, playerId('player_1'), 'Animals'),
        createCategorySuggestion(categorySuggestionId('cs_2'), currentRoomId, currentRoundId, playerId('player_2'), 'Movies'),
      ],
    })
    const ctx = createCtx(tables)

    await submitCategorySuggestionHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      playerId: playerId('player_3'),
      text: 'Food',
    })

    expect(tables.rooms[0].status).toBe(GAME_STATUS.CATEGORY_VOTING)
    expect(tables.rounds[0].categoryVoteEndsAt).toEqual(expect.any(Number))
  })
})

describe('getCategorySuggestionStateHandler', () => {
  it('reports progress without exposing suggestion texts', async () => {
    const tables = makeTables({
      categorySuggestions: [
        createCategorySuggestion(categorySuggestionId('cs_1'), currentRoomId, currentRoundId, playerId('player_1'), 'Animals'),
      ],
    })
    const ctx = createCtx(tables)

    const state = await getCategorySuggestionStateHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      playerId: playerId('player_1'),
    })

    expect(state).toEqual({
      suggestionEndsAt: expect.any(Number),
      suggestedCount: 1,
      activePlayerCount: 3,
      hasSuggested: true,
    })
  })
})

describe('advanceCategorySuggestionIfExpiredHandler', () => {
  it('does not advance before the deadline', async () => {
    const tables = makeTables()
    const ctx = createCtx(tables)

    const result = await advanceCategorySuggestionIfExpiredHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(result.advanced).toBe(false)
    expect(tables.rooms[0].status).toBe(GAME_STATUS.CATEGORY_SUGGESTION)
  })

  it('restarts the phase when the deadline passes with no suggestions', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(100_000)
    const tables = makeTables({
      rounds: [createWordlessRound(currentRoundId, currentRoomId, { suggestionEndsAt: 99_000 })],
    })
    const ctx = createCtx(tables)

    const result = await advanceCategorySuggestionIfExpiredHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(result.advanced).toBe(true)
    expect(tables.rooms[0].status).toBe(GAME_STATUS.CATEGORY_SUGGESTION)
    expect(tables.rounds[0].suggestionEndsAt).toBe(100_000 + 45_000)
    vi.useRealTimers()
  })

  it('skips voting when exactly one suggestion exists', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(100_000)
    const tables = makeTables({
      rounds: [createWordlessRound(currentRoundId, currentRoomId, { suggestionEndsAt: 99_000 })],
      categorySuggestions: [
        createCategorySuggestion(categorySuggestionId('cs_1'), currentRoomId, currentRoundId, playerId('player_1'), 'Animals'),
      ],
    })
    const ctx = createCtx(tables)

    await advanceCategorySuggestionIfExpiredHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(tables.rooms[0].status).toBe(GAME_STATUS.WORD_SUBMISSION)
    expect(tables.rounds[0].category).toBe('Animals')
    expect(tables.rounds[0].wordSubmissionEndsAt).toBe(100_000 + 45_000)
    vi.useRealTimers()
  })

  it('moves to voting when multiple suggestions exist at the deadline', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(100_000)
    const tables = makeTables({
      rounds: [createWordlessRound(currentRoundId, currentRoomId, { suggestionEndsAt: 99_000 })],
      categorySuggestions: [
        createCategorySuggestion(categorySuggestionId('cs_1'), currentRoomId, currentRoundId, playerId('player_1'), 'Animals'),
        createCategorySuggestion(categorySuggestionId('cs_2'), currentRoomId, currentRoundId, playerId('player_2'), 'Movies'),
      ],
    })
    const ctx = createCtx(tables)

    await advanceCategorySuggestionIfExpiredHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(tables.rooms[0].status).toBe(GAME_STATUS.CATEGORY_VOTING)
    expect(tables.rounds[0].categoryVoteEndsAt).toBe(100_000 + 45_000)
    vi.useRealTimers()
  })
})
