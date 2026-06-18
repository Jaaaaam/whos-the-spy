import { useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { getConvexErrorMessage } from '../../../../shared/lib/getConvexErrorMessage'

export function useAdvanceDiscussionIfExpired() {
  const advanceMutation = useMutation(api.game.advanceDiscussionIfExpired)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function advanceDiscussionIfExpired(
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
        'Unable to advance discussion timer.',
      )
      setError(message)
      throw error
    } finally {
      setIsAdvancing(false)
    }
  }

  return { advanceDiscussionIfExpired, isAdvancing, error }
}
