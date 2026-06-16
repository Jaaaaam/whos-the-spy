import { useMutation } from 'convex/react'
import { useCallback, useState } from 'react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { getConvexErrorMessage } from '../../../shared/lib/getConvexErrorMessage'
import { GAME_ERROR } from '../../../../convex/game/errors'

type SkipVoteArgs = {
  roomId: Id<'rooms'>
  roundId: Id<'rounds'>
  voterPlayerId: Id<'players'>
}

export function useSkipVote() {
  const skipMutation = useMutation(api.game.skipVote)
  const [isSkipping, setIsSkipping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const skipVote = useCallback(async ({ roomId, roundId, voterPlayerId }: SkipVoteArgs) => {
    setIsSkipping(true)
    setError(null)
    try {
      return await skipMutation({ roomId, roundId, voterPlayerId })
    } catch (err) {
      const message = getConvexErrorMessage(err, GAME_ERROR.GENERIC_ERROR)
      setError(message)
    } finally {
      setIsSkipping(false)
    }
  }, [skipMutation])

  return { skipVote, isSkipping, error }
}
