export const TABLE = {
  ROOMS: 'rooms',
  PLAYERS: 'players',
  ROUNDS: 'rounds',
  ROLE_ASSIGNMENTS: 'roleAssignments',
  VOTES: 'votes',
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
} as const
