import { useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { getConvexErrorMessage } from '../../../../shared/lib/getConvexErrorMessage'

export function useAdvanceVotingIfExpired() {
  const advanceMutation = useMutation(api.game.advanceVotingIfExpired)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function advanceVotingIfExpired(
    roomId: Id<'rooms'>,
    roundId: Id<'rounds'>,
  ) {
    setIsAdvancing(true)
    setError(null)

    try {
      return await advanceMutation({ roomId, roundId })
    } catch (error) {
      const message = getConvexErrorMessage(
        error,
        'Unable to advance voting timer.',
      )
      setError(message)
      throw error
    } finally {
      setIsAdvancing(false)
    }
  }

  return { advanceVotingIfExpired, isAdvancing, error }
}
