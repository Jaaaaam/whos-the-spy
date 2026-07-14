import type { GameStatus } from "../../shared/gameStatus"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { GAME_ERROR } from "./errors"
import type { RoomRoundArgs } from "./types"

export async function getCurrentPhaseRound(
  ctx: QueryCtx | MutationCtx,
  { roomId, roundId }: RoomRoundArgs,
  status: GameStatus,
  statusError: string,
) {
  const room = await ctx.db.get(roomId)
  if (!room) throw new Error(GAME_ERROR.ROOM_NOT_FOUND)
  if (room.status !== status) throw new Error(statusError)
  if (room.currentRoundId !== roundId) throw new Error(GAME_ERROR.NOT_CURRENT_ROOM_ROUND)

  const round = await ctx.db.get(roundId)
  if (!round || round.roomId !== roomId) throw new Error(GAME_ERROR.ROUND_NOT_FOUND)

  return { room, round }
}
