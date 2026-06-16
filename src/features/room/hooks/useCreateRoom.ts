import { useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../../convex/_generated/api'
import { saveCurrentPlayerId } from '../lib/currentPlayer'

export function useCreateRoom() {
  const createRoomMutation = useMutation(api.rooms.createRoom)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createRoom(playerName: string, discussionTurnDurationMs: 60000 | 120000 | 180000) {
    setIsCreating(true)
    setError(null)

    try {
      const result = await createRoomMutation({ playerName, discussionTurnDurationMs })

      if (!result.playerId || !result.code) {
        throw new Error('Room was created, but Convex did not return the room code.')
      }

      saveCurrentPlayerId(result.playerId)
      return result
    } catch (error) {
      setError('Could not create the room. Try again.')
      return null
    } finally {
      setIsCreating(false)
    }
  }

  return { createRoom, isCreating, error }
}
