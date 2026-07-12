export const GAME_STATUS = {
  LOBBY: 'lobby',
  CATEGORY_SUGGESTION: 'category_suggestion',
  CATEGORY_VOTING: 'category_voting',
  WORD_SUBMISSION: 'word_submission',
  ROLE_REVEAL: 'role_reveal',
  DISCUSSION: 'discussion',
  VOTING: 'voting',
  BATTLE: 'battle',
  RESULTS: 'results',
} as const

export type GameStatus = typeof GAME_STATUS[keyof typeof GAME_STATUS]
