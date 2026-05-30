import { useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { getConvexErrorMessage } from '../../../shared/lib/getConvexErrorMessage'

export function useStartRound() {
  const startRoundMutation = useMutation(api.game.startRound)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startRound(roomId: Id<'rooms'>, hostPlayerId: Id<'players'>) {
    setIsStarting(true)
    setError(null)

    try {
      console.log('[Convex] startRound mutation args', { roomId, hostPlayerId })
      const result = await startRoundMutation({ roomId, hostPlayerId })
      console.log('[Convex] startRound mutation result', result)
      return result
    } catch (error) {
      console.error('[Convex] startRound mutation failed', error)
      setError(getConvexErrorMessage(error))
      return null
    } finally {
      setIsStarting(false)
    }
  }

  return { startRound, isStarting, error }
}
