import { useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../../convex/_generated/api'
import { saveCurrentPlayerId } from '../lib/currentPlayer'
import { getConvexErrorMessage } from '../../../shared/lib/getConvexErrorMessage'

export function useJoinRoom() {
  const joinRoomMutation = useMutation(api.players.joinRoom)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function joinRoom(roomCode: string, playerName: string) {
    const normalizedRoomCode = roomCode.trim().toUpperCase()

    setIsJoining(true)
    setError(null)

    try {
      console.log('[Convex] joinRoom mutation args', {
        roomCode: normalizedRoomCode,
        playerName,
      })
      const result = await joinRoomMutation({
        roomCode: normalizedRoomCode,
        playerName,
      })
      console.log('[Convex] joinRoom mutation result', result)

      saveCurrentPlayerId(result.playerId)
      return result
    } catch (error) {
      console.error('[Convex] joinRoom mutation failed', error)
      setError(getConvexErrorMessage(error))
      return null
    } finally {
      setIsJoining(false)
    }
  }

  return { joinRoom, isJoining, error }
}
