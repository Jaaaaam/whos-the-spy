import { describe, expect, it } from 'vitest'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { getPathForStatus } from './statusRoutes'

describe('getPathForStatus', () => {
  it.each([
    [GAME_STATUS.LOBBY, '/room/SPY247'],
    [GAME_STATUS.CATEGORY_SUGGESTION, '/room/SPY247/category-suggestion'],
    [GAME_STATUS.CATEGORY_VOTING, '/room/SPY247/category-voting'],
    [GAME_STATUS.WORD_SUBMISSION, '/room/SPY247/word-submission'],
    [GAME_STATUS.ROLE_REVEAL, '/room/SPY247/role'],
    [GAME_STATUS.DISCUSSION, '/room/SPY247/discussion'],
    [GAME_STATUS.VOTING, '/room/SPY247/voting'],
    [GAME_STATUS.BATTLE, '/room/SPY247/battle'],
    [GAME_STATUS.RESULTS, '/room/SPY247/results'],
  ])('maps %s to %s', (status, expected) => {
    expect(getPathForStatus(status, 'SPY247')).toBe(expected)
  })
})
