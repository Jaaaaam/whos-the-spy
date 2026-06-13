import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

export function usePlayersByRoom(roomId: Id<'rooms'> | undefined) {
  const players = useQuery(
    api.players.getPlayersInRoom,
    roomId ? { roomId } : 'skip',
  )

  return {
    players,
    isLoading: roomId ? players === undefined : false,
    isEmpty: players !== undefined && players.length === 0,
  }
}
