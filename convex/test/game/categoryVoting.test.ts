import { afterEach, describe, expect, it, vi } from 'vitest'
import { GAME_STATUS } from '../../../shared/gameStatus'
import {
  advanceCategoryVotingIfExpiredHandler,
  castCategoryVoteHandler,
  getCategoryVotingStateHandler,
} from '../../game/categoryVoting'
import { GAME_ERROR } from '../../game/errors'
import {
  categorySuggestionId,
  categoryVoteId,
  createCategorySuggestion,
  createCategoryVote,
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
      ...createRoomWithStatus(currentRoomId, GAME_STATUS.CATEGORY_VOTING, currentRoundId),
      mode: 'wordless_spy',
    }],
    players: [
      createPlayer(playerId('player_1'), currentRoomId, true),
      createPlayer(playerId('player_2'), currentRoomId),
      createPlayer(playerId('player_3'), currentRoomId),
    ],
    rounds: [createWordlessRound(currentRoundId, currentRoomId, { categoryVoteEndsAt: Date.now() + 45_000 })],
    roleAssignments: [],
    categorySuggestions: [
      createCategorySuggestion(categorySuggestionId('cs_1'), currentRoomId, currentRoundId, playerId('player_1'), 'Animals'),
      createCategorySuggestion(categorySuggestionId('cs_2'), currentRoomId, currentRoundId, playerId('player_2'), 'Movies'),
      createCategorySuggestion(categorySuggestionId('cs_3'), currentRoomId, currentRoundId, playerId('player_3'), 'Food'),
    ],
    categoryVotes: [],
    wordSubmissions: [],
    ...overrides,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('castCategoryVoteHandler', () => {
  it('rejects voting for your own category', async () => {
    const ctx = createCtx(makeTables())

    await expect(
      castCategoryVoteHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        voterPlayerId: playerId('player_1'),
        suggestionId: categorySuggestionId('cs_1'),
      }),
    ).rejects.toThrow(GAME_ERROR.CANNOT_VOTE_OWN_CATEGORY)
  })

  it('records a vote and updates it on re-vote', async () => {
    const tables = makeTables()
    const ctx = createCtx(tables)

    const first = await castCategoryVoteHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: playerId('player_1'),
      suggestionId: categorySuggestionId('cs_2'),
    })
    const second = await castCategoryVoteHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: playerId('player_1'),
      suggestionId: categorySuggestionId('cs_3'),
    })

    expect(first.isUpdated).toBe(false)
    expect(second.isUpdated).toBe(true)
    expect(tables.categoryVotes).toHaveLength(1)
    expect(tables.categoryVotes![0].suggestionId).toBe(categorySuggestionId('cs_3'))
  })

  it('finishes voting once every active player has voted', async () => {
    const tables = makeTables({
      categoryVotes: [
        createCategoryVote(categoryVoteId('cv_1'), currentRoomId, currentRoundId, playerId('player_1'), categorySuggestionId('cs_2')),
        createCategoryVote(categoryVoteId('cv_2'), currentRoomId, currentRoundId, playerId('player_2'), categorySuggestionId('cs_3')),
      ],
    })
    const ctx = createCtx(tables)

    await castCategoryVoteHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      voterPlayerId: playerId('player_3'),
      suggestionId: categorySuggestionId('cs_2'),
    })

    expect(tables.rooms[0].status).toBe(GAME_STATUS.WORD_SUBMISSION)
    expect(tables.rounds[0].category).toBe('Movies')
    expect(tables.rounds[0].wordSubmissionEndsAt).toEqual(expect.any(Number))
  })
})

describe('getCategoryVotingStateHandler', () => {
  it('lists suggestions and marks the viewer’s own', async () => {
    const ctx = createCtx(makeTables())

    const state = await getCategoryVotingStateHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      playerId: playerId('player_1'),
    })

    expect(state?.suggestions).toEqual([
      { suggestionId: categorySuggestionId('cs_1'), text: 'Animals', isMine: true },
      { suggestionId: categorySuggestionId('cs_2'), text: 'Movies', isMine: false },
      { suggestionId: categorySuggestionId('cs_3'), text: 'Food', isMine: false },
    ])
    expect(state?.votedCount).toBe(0)
    expect(state?.activePlayerCount).toBe(3)
    expect(state?.myVoteSuggestionId).toBeNull()
  })
})

describe('advanceCategoryVotingIfExpiredHandler', () => {
  it('picks the top-voted category at the deadline', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(100_000)
    const tables = makeTables({
      rounds: [createWordlessRound(currentRoundId, currentRoomId, { categoryVoteEndsAt: 99_000 })],
      categoryVotes: [
        createCategoryVote(categoryVoteId('cv_1'), currentRoomId, currentRoundId, playerId('player_1'), categorySuggestionId('cs_2')),
        createCategoryVote(categoryVoteId('cv_2'), currentRoomId, currentRoundId, playerId('player_3'), categorySuggestionId('cs_2')),
      ],
    })
    const ctx = createCtx(tables)

    const result = await advanceCategoryVotingIfExpiredHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(result.advanced).toBe(true)
    expect(tables.rounds[0].category).toBe('Movies')
    expect(tables.rounds[0].wordSubmissionEndsAt).toBe(100_000 + 45_000)
    expect(tables.rooms[0].status).toBe(GAME_STATUS.WORD_SUBMISSION)
  })

  it('breaks ties randomly among the top categories', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(100_000)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const tables = makeTables({
      rounds: [createWordlessRound(currentRoundId, currentRoomId, { categoryVoteEndsAt: 99_000 })],
      categoryVotes: [
        createCategoryVote(categoryVoteId('cv_1'), currentRoomId, currentRoundId, playerId('player_2'), categorySuggestionId('cs_1')),
        createCategoryVote(categoryVoteId('cv_2'), currentRoomId, currentRoundId, playerId('player_1'), categorySuggestionId('cs_2')),
      ],
    })
    const ctx = createCtx(tables)

    await advanceCategoryVotingIfExpiredHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(tables.rounds[0].category).toBe('Movies')
  })

  it('picks randomly when nobody voted', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(100_000)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const tables = makeTables({
      rounds: [createWordlessRound(currentRoundId, currentRoomId, { categoryVoteEndsAt: 99_000 })],
    })
    const ctx = createCtx(tables)

    await advanceCategoryVotingIfExpiredHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(tables.rounds[0].category).toBe('Animals')
    expect(tables.rooms[0].status).toBe(GAME_STATUS.WORD_SUBMISSION)
  })
})
