import { useMutation } from 'convex/react'
import { useCallback } from 'react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

export function usePlayerConnection() {
  const setPlayerConnection = useMutation(api.players.setPlayerConnection)

  const reconnectPlayer = useCallback(async (roomId: Id<'rooms'>, playerId: Id<'players'>) => {
    return await setPlayerConnection({
      roomId,
      playerId,
      isConnected: true,
    })
  }, [setPlayerConnection])

  const disconnectPlayer = useCallback(async (roomId: Id<'rooms'>, playerId: Id<'players'>) => {
    return await setPlayerConnection({
      roomId,
      playerId,
      isConnected: false,
    })
  }, [setPlayerConnection])

  return { reconnectPlayer, disconnectPlayer }
}
