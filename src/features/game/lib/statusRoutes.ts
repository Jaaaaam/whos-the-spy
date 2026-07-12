import { GAME_STATUS, type GameStatus } from '../../../../shared/gameStatus'

const STATUS_PATH_SUFFIX: Record<GameStatus, string> = {
  [GAME_STATUS.LOBBY]: '',
  [GAME_STATUS.CATEGORY_SUGGESTION]: '/category-suggestion',
  [GAME_STATUS.CATEGORY_VOTING]: '/category-voting',
  [GAME_STATUS.WORD_SUBMISSION]: '/word-submission',
  [GAME_STATUS.ROLE_REVEAL]: '/role',
  [GAME_STATUS.DISCUSSION]: '/discussion',
  [GAME_STATUS.VOTING]: '/voting',
  [GAME_STATUS.BATTLE]: '/battle',
  [GAME_STATUS.RESULTS]: '/results',
}

export function getPathForStatus(status: GameStatus, roomCode: string) {
  return `/room/${roomCode}${STATUS_PATH_SUFFIX[status]}`
}
