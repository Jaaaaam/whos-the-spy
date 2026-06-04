export const GAME_STATUS = {
  LOBBY: 'lobby',
  ROLE_REVEAL: 'role_reveal',
  DISCUSSION: 'discussion',
  VOTING: 'voting',
  RESULTS: 'results',
} as const

export type GameStatus = typeof GAME_STATUS[keyof typeof GAME_STATUS]
