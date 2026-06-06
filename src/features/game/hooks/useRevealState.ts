import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { RoundIdArgs } from '../types'

export function useRevealState({ roundId }: RoundIdArgs) {
  const revealState = useQuery(api.game.getRevealState, roundId ? { roundId } : 'skip')

  return {
    revealState,
    isLoading: Boolean(roundId) && revealState === undefined,
    notFound: revealState === null,
  }
}
