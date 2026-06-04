import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

type UseRoundArgs = {
  roundId: Id<'rounds'> | undefined
}

export function useRevealState({ roundId }: UseRoundArgs) {
  const revealState = useQuery(api.game.getRevealState, roundId ? { roundId } : 'skip')

  return {
    revealState,
    isLoading: Boolean(roundId) && revealState === undefined,
    notFound: revealState === null,
  }
}
