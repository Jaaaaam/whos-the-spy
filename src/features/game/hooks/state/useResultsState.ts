import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'

type UseResultsStateArgs = {
  roomId?: Id<'rooms'>
  roundId?: Id<'rounds'>
}

export function useResultsState({ roomId, roundId }: UseResultsStateArgs) {
  const resultsState = useQuery(
    api.game.getResultsState,
    roomId && roundId ? { roomId, roundId } : 'skip',
  )

  return {
    resultsState,
    isLoading: Boolean(roomId && roundId) && resultsState === undefined,
  }
}
