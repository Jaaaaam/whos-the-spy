import { useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { getConvexErrorMessage } from '../../../../shared/lib/getConvexErrorMessage'

type CastVoteArgs = {
  roomId: Id<'rooms'>
  roundId: Id<'rounds'>
  voterPlayerId: Id<'players'>
  targetPlayerId: Id<'players'>
}

export function useCastVote() {
  const votingMutation = useMutation(api.game.castVote)
  const [isCastingVote, setIsCastingVote] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function castVote({
    roomId,
    roundId,
    voterPlayerId,
    targetPlayerId
  }: CastVoteArgs) {
    setIsCastingVote(true)
    setError(null)

    try {
      return await votingMutation({ roomId, roundId, voterPlayerId, targetPlayerId })
    } catch (error) {
      const message = getConvexErrorMessage(error, 'Unable to cast vote.')
      setError(message)
      throw error
    } finally {
      setIsCastingVote(false)
    }
  }

  return { castVote, isCastingVote, error }
}
