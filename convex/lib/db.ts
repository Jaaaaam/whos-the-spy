export const TABLE = {
  ROOMS: 'rooms',
  PLAYERS: 'players',
  ROUNDS: 'rounds',
  ROLE_ASSIGNMENTS: 'roleAssignments',
  VOTES: 'votes',
  CATEGORY_SUGGESTIONS: 'categorySuggestions',
  CATEGORY_VOTES: 'categoryVotes',
  WORD_SUBMISSIONS: 'wordSubmissions',
} as const

export const INDEX = {
  ROOMS_BY_CODE: 'by_code',
  PLAYERS_BY_ROOM_ID: 'by_roomId',
  ROUNDS_BY_ROOM_ID: 'by_roomId',
  ROLE_ASSIGNMENTS_BY_ROUND_ID: 'by_roundId',
  ROLE_ASSIGNMENTS_BY_ROUND_ID_PLAYER_ID: 'by_roundId_playerId',
  ROLE_ASSIGNMENTS_BY_ROOM_ID: 'by_roomId',
  VOTES_BY_ROUND_ID: 'by_roundId',
  VOTES_BY_ROUND_ID_VOTER_PLAYER_ID: 'by_roundId_voterPlayerId',
  VOTES_BY_ROUND_ID_TARGET_PLAYER_ID: 'by_roundId_targetPlayerId',
  VOTES_BY_ROOM_ID_ROUND_ID: 'by_roomId_roundId',
  CATEGORY_SUGGESTIONS_BY_ROUND_ID: 'by_roundId',
  CATEGORY_SUGGESTIONS_BY_ROUND_ID_PLAYER_ID: 'by_roundId_playerId',
  CATEGORY_VOTES_BY_ROUND_ID: 'by_roundId',
  CATEGORY_VOTES_BY_ROUND_ID_VOTER_PLAYER_ID: 'by_roundId_voterPlayerId',
  WORD_SUBMISSIONS_BY_ROUND_ID: 'by_roundId',
  WORD_SUBMISSIONS_BY_ROUND_ID_PLAYER_ID: 'by_roundId_playerId',
} as const
