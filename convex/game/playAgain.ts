import type { MutationCtx } from '../_generated/server'
import type { Id } from '../_generated/dataModel'
import { GAME_STATUS } from '../../shared/gameStatus'
import { INDEX, TABLE } from '../lib/db'
import { GAME_ERROR } from './errors'

export type PlayAgainArgs = {
  roomId: Id<'rooms'>
  hostPlayerId: Id<'players'>
}

export async function playAgainHandler(
  ctx: MutationCtx,
  { roomId, hostPlayerId }: PlayAgainArgs,
) {
  const room = await ctx.db.get(roomId)
  if (!room) throw new Error(GAME_ERROR.ROOM_NOT_FOUND)
  if (room.status !== GAME_STATUS.RESULTS) throw new Error(GAME_ERROR.INVALID_STATUS)

  const host = await ctx.db.get(hostPlayerId)
  if (!host) throw new Error(GAME_ERROR.HOST_PLAYER_NOT_FOUND)
  if (!host.isHost) throw new Error(GAME_ERROR.NOT_HOST)
  if (host.roomId !== roomId) throw new Error(GAME_ERROR.HOST_NOT_IN_ROOM)

  const [rounds, roleAssignments, players] = await Promise.all([
    ctx.db.query(TABLE.ROUNDS).withIndex(INDEX.ROUNDS_BY_ROOM_ID, (q) => q.eq('roomId', roomId)).collect(),
    ctx.db.query(TABLE.ROLE_ASSIGNMENTS).withIndex(INDEX.ROLE_ASSIGNMENTS_BY_ROOM_ID, (q) => q.eq('roomId', roomId)).collect(),
    ctx.db.query(TABLE.PLAYERS).withIndex(INDEX.PLAYERS_BY_ROOM_ID, (q) => q.eq('roomId', roomId)).collect(),
  ])

  const votes = await Promise.all(
    rounds.map((round) =>
      ctx.db.query(TABLE.VOTES).withIndex(INDEX.VOTES_BY_ROOM_ID_ROUND_ID, (q) =>
        q.eq('roomId', roomId).eq('roundId', round._id),
      ).collect(),
    ),
  )

  await Promise.all([
    ...votes.flat().map((v) => ctx.db.delete(v._id)),
    ...roleAssignments.map((ra) => ctx.db.delete(ra._id)),
    ...rounds.map((r) => ctx.db.delete(r._id)),
    ...players.filter((p) => p.isEliminated).map((p) => ctx.db.patch(p._id, { isEliminated: false })),
    ctx.db.patch(roomId, { status: GAME_STATUS.LOBBY, currentRoundId: undefined }),
  ])
}
