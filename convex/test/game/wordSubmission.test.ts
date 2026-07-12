import { afterEach, describe, expect, it, vi } from 'vitest'
import { GAME_STATUS } from '../../../shared/gameStatus'
import { GAME_ERROR } from '../../game/errors'
import {
  advanceWordSubmissionIfExpiredHandler,
  getWordSubmissionStateHandler,
  submitWordHandler,
} from '../../game/wordSubmission'
import {
  createCtx,
  createPlayer,
  createRoomWithStatus,
  createWordlessRound,
  createWordSubmission,
  playerId,
  roomId,
  roundId,
  wordSubmissionId,
  type StoredTables,
} from '../gameTestUtils'

const currentRoomId = roomId('room_1')
const currentRoundId = roundId('round_1')

function makeTables(overrides: Partial<StoredTables> = {}): StoredTables {
  return {
    rooms: [{
      ...createRoomWithStatus(currentRoomId, GAME_STATUS.WORD_SUBMISSION, currentRoundId),
      mode: 'wordless_spy',
    }],
    players: [
      createPlayer(playerId('player_1'), currentRoomId, true),
      createPlayer(playerId('player_2'), currentRoomId),
      createPlayer(playerId('player_3'), currentRoomId),
    ],
    rounds: [createWordlessRound(currentRoundId, currentRoomId, {
      category: 'Animals',
      wordSubmissionEndsAt: Date.now() + 45_000,
    })],
    roleAssignments: [],
    wordSubmissions: [],
    ...overrides,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('submitWordHandler', () => {
  it('stores a trimmed word and rejects empty words', async () => {
    const tables = makeTables()
    const ctx = createCtx(tables)

    await submitWordHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      playerId: playerId('player_1'),
      word: '  Lion ',
    })

    expect(tables.wordSubmissions![0].word).toBe('Lion')

    await expect(
      submitWordHandler(ctx, {
        roomId: currentRoomId,
        roundId: currentRoundId,
        playerId: playerId('player_2'),
        word: '  ',
      }),
    ).rejects.toThrow(GAME_ERROR.EMPTY_SUBMISSION)
  })

  it('draws a word and moves to role reveal once every active player has submitted', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const tables = makeTables({
      wordSubmissions: [
        createWordSubmission(wordSubmissionId('ws_1'), currentRoomId, currentRoundId, playerId('player_1'), 'Lion'),
        createWordSubmission(wordSubmissionId('ws_2'), currentRoomId, currentRoundId, playerId('player_2'), 'Tiger'),
      ],
    })
    const ctx = createCtx(tables)

    await submitWordHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      playerId: playerId('player_3'),
      word: 'Bear',
    })

    expect(tables.rooms[0].status).toBe(GAME_STATUS.ROLE_REVEAL)
    expect(tables.rounds[0].civilianWord).toBe('Lion')
    expect(tables.rounds[0].revealEndsAt).toEqual(expect.any(Number))
  })
})

describe('getWordSubmissionStateHandler', () => {
  it('exposes the category and progress', async () => {
    const tables = makeTables({
      wordSubmissions: [
        createWordSubmission(wordSubmissionId('ws_1'), currentRoomId, currentRoundId, playerId('player_1'), 'Lion'),
      ],
    })
    const ctx = createCtx(tables)

    const state = await getWordSubmissionStateHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
      playerId: playerId('player_2'),
    })

    expect(state).toEqual({
      wordSubmissionEndsAt: expect.any(Number),
      category: 'Animals',
      submittedCount: 1,
      activePlayerCount: 3,
      hasSubmitted: false,
    })
  })
})

describe('advanceWordSubmissionIfExpiredHandler', () => {
  it('restarts the phase when nobody submitted', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(100_000)
    const tables = makeTables({
      rounds: [createWordlessRound(currentRoundId, currentRoomId, {
        category: 'Animals',
        wordSubmissionEndsAt: 99_000,
      })],
    })
    const ctx = createCtx(tables)

    const result = await advanceWordSubmissionIfExpiredHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(result.advanced).toBe(true)
    expect(tables.rooms[0].status).toBe(GAME_STATUS.WORD_SUBMISSION)
    expect(tables.rounds[0].wordSubmissionEndsAt).toBe(100_000 + 45_000)
  })

  it('draws from all submissions at the deadline, duplicates weighting the draw', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(100_000)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const tables = makeTables({
      rounds: [createWordlessRound(currentRoundId, currentRoomId, {
        category: 'Animals',
        wordSubmissionEndsAt: 99_000,
      })],
      wordSubmissions: [
        createWordSubmission(wordSubmissionId('ws_1'), currentRoomId, currentRoundId, playerId('player_1'), 'Lion'),
        createWordSubmission(wordSubmissionId('ws_2'), currentRoomId, currentRoundId, playerId('player_2'), 'Tiger'),
      ],
    })
    const ctx = createCtx(tables)

    await advanceWordSubmissionIfExpiredHandler(ctx, {
      roomId: currentRoomId,
      roundId: currentRoundId,
    })

    expect(tables.rounds[0].civilianWord).toBe('Tiger')
    expect(tables.rounds[0].revealEndsAt).toBe(100_000 + 30_000)
    expect(tables.rooms[0].status).toBe(GAME_STATUS.ROLE_REVEAL)
  })
})
