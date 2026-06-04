import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

type UseRoundArgs = {
  roundId: Id<'rounds'> | undefined
}

export function useRound({ roundId }: UseRoundArgs) {
  const round = useQuery(api.game.getRound, roundId ? { roundId } : 'skip')

  return {
    round,
    isLoading: Boolean(roundId) && round === undefined,
    notFound: round === null,
  }
}
