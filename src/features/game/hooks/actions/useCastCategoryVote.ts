import { useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { getConvexErrorMessage } from '../../../../shared/lib/getConvexErrorMessage'

type CastCategoryVoteArgs = {
  roomId: Id<'rooms'>
  roundId: Id<'rounds'>
  voterPlayerId: Id<'players'>
  suggestionId: Id<'categorySuggestions'>
}

export function useCastCategoryVote() {
  const castMutation = useMutation(api.game.castCategoryVote)
  const [isCastingVote, setIsCastingVote] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function castCategoryVote(args: CastCategoryVoteArgs) {
    setIsCastingVote(true)
    setError(null)

    try {
      return await castMutation(args)
    } catch (error) {
      setError(getConvexErrorMessage(error, 'Unable to cast category vote.'))
      throw error
    } finally {
      setIsCastingVote(false)
    }
  }

  return { castCategoryVote, isCastingVote, error }
}
