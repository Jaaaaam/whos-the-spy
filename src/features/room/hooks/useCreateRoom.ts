import { useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../../convex/_generated/api'
import { saveCurrentPlayerId } from '../lib/currentPlayer'

export function useCreateRoom() {
  const createRoomMutation = useMutation(api.rooms.createRoom)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createRoom(playerName: string) {
    setIsCreating(true)
    setError(null)

    try {
      console.log('[Convex] createRoom mutation args', { playerName })
      const result = await createRoomMutation({ playerName })
      console.log('[Convex] createRoom mutation result', result)

      if (!result.playerId || !result.code) {
        throw new Error('Room was created, but Convex did not return the room code.')
      }

      saveCurrentPlayerId(result.playerId)
      return result
    } catch (error) {
      console.error('[Convex] createRoom mutation failed', error)
      setError('Could not create the room. Try again.')
      return null
    } finally {
      setIsCreating(false)
    }
  }

  return { createRoom, isCreating, error }
}
