import { useQuery } from 'convex/react'
import { useEffect } from 'react'
import { api } from '../../../../convex/_generated/api'

export function useRoomByCode(roomCode: string | undefined) {
  const normalizedRoomCode = roomCode?.trim().toUpperCase()
  const room = useQuery(
    api.rooms.getRoomByCode,
    normalizedRoomCode ? { code: normalizedRoomCode } : 'skip',
  )

  useEffect(() => {
    console.log('[Convex] room query result', {
      roomCode: normalizedRoomCode,
      room,
    })
  }, [normalizedRoomCode, room])

  return {
    room,
    isLoading: normalizedRoomCode ? room === undefined : false,
    notFound: normalizedRoomCode ? room === null : false,
  }
}
