export const GAME_MODE = {
  SIMILAR_WORDS: 'similar_words',
  WORDLESS_SPY: 'wordless_spy',
} as const

export type GameMode = typeof GAME_MODE[keyof typeof GAME_MODE]
