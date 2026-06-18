import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { RoomRoundIdArgs } from '../../types'

export function useBattleState({ roomId, roundId }: RoomRoundIdArgs) {
  const battleState = useQuery(
    api.game.getBattleState,
    roomId && roundId ? { roomId, roundId } : 'skip',
  )

  return {
    battleState,
    isLoading: Boolean(roomId && roundId) && battleState === undefined,
  }
}
