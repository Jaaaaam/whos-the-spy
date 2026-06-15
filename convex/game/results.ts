import { GAME_STATUS } from '../../shared/gameStatus'
import type { QueryCtx } from '../_generated/server'
import { INDEX, TABLE } from '../lib/db'
import { GAME_ERROR } from './errors'
import type { RoomRoundArgs } from './types'

export async function getResultsStateHandler(ctx: QueryCtx, { roomId, roundId }: RoomRoundArgs) {
  const room = await ctx.db.get(roomId)
  if (!room) throw new Error(GAME_ERROR.ROOM_NOT_FOUND)
  if (room.status !== GAME_STATUS.RESULTS) return null
  if (room.currentRoundId !== roundId) return null

  const round = await ctx.db.get(roundId)
  if (!round || round.roomId !== roomId) throw new Error(GAME_ERROR.ROUND_NOT_FOUND)

  const roleAssignment = round.eliminatedPlayerId
    ? await ctx.db
        .query(TABLE.ROLE_ASSIGNMENTS)
        .withIndex(INDEX.ROLE_ASSIGNMENTS_BY_ROUND_ID_PLAYER_ID, (q) =>
          q.eq('roundId', roundId).eq('playerId', round.eliminatedPlayerId!))
        .unique()
    : null

  const votes = await ctx.db
    .query(TABLE.VOTES)
    .withIndex(INDEX.VOTES_BY_ROOM_ID_ROUND_ID, (q) =>
      q.eq('roomId', roomId).eq('roundId', roundId))
    .collect()

  const allPlayers = await ctx.db
    .query(TABLE.PLAYERS)
    .withIndex(INDEX.PLAYERS_BY_ROOM_ID, (q) => q.eq('roomId', roomId))
    .collect()
  const playerNameById = new Map(allPlayers.map((p) => [p._id as string, p.name]))

  const votingHistory = votes.map((vote) => ({
    voterName: playerNameById.get(vote.voterPlayerId) ?? 'Unknown',
    targetName: vote.targetPlayerId ? (playerNameById.get(vote.targetPlayerId) ?? 'Unknown') : 'Unknown',
  }))

  return {
    civilianWord: round.civilianWord,
    spyWord: round.spyWord,
    eliminatedPlayerName: round.eliminatedPlayerId
      ? (playerNameById.get(round.eliminatedPlayerId) ?? null)
      : null,
    isEliminatedPlayerSpy: roleAssignment?.role === 'spy',
    didSpyWin: round.didSpyWon ?? false,
    isGameOver: round.isGameOver ?? true,
    votingHistory,
  }
}
