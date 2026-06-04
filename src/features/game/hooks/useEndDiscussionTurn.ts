import { useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { getConvexErrorMessage } from '../../../shared/lib/getConvexErrorMessage'

export function useEndDiscussionTurn() {
  const endDiscussionTurnMutation = useMutation(api.game.endDiscussionTurn)
  const [isEndingTurn, setIsEndingTurn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function endDiscussionTurn(
    roomId: Id<'rooms'>,
    roundId: Id<'rounds'>,
    playerId: Id<'players'>,
  ) {
    setIsEndingTurn(true)
    setError(null)

    try {
      return await endDiscussionTurnMutation({ roomId, roundId, playerId })
    } catch (error) {
      const message = getConvexErrorMessage(error, 'Unable to end discussion turn.')
      setError(message)
      throw error
    } finally {
      setIsEndingTurn(false)
    }
  }

  return { endDiscussionTurn, isEndingTurn, error }
}
