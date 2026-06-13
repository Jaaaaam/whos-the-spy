import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function useRoomByCode(roomCode: string | undefined) {
  const normalizedRoomCode = roomCode?.trim().toUpperCase()
  const room = useQuery(
    api.rooms.getRoomByCode,
    normalizedRoomCode ? { code: normalizedRoomCode } : 'skip',
  )

  return {
    room,
    isLoading: normalizedRoomCode ? room === undefined : false,
    notFound: normalizedRoomCode ? room === null : false,
  }
}
