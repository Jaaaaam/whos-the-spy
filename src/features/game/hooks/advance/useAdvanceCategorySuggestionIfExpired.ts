import { useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { getConvexErrorMessage } from '../../../../shared/lib/getConvexErrorMessage'

export function useAdvanceCategorySuggestionIfExpired() {
  const advanceMutation = useMutation(api.game.advanceCategorySuggestionIfExpired)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function advanceCategorySuggestionIfExpired(roomId: Id<'rooms'>, roundId: Id<'rounds'>) {
    setIsAdvancing(true)
    setError(null)

    try {
      return await advanceMutation({ roomId, roundId })
    } catch (error) {
      setError(getConvexErrorMessage(error, 'Unable to advance the phase.'))
      throw error
    } finally {
      setIsAdvancing(false)
    }
  }

  return { advanceCategorySuggestionIfExpired, isAdvancing, error }
}
