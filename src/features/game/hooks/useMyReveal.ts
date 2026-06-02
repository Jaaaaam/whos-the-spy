import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

type UseMyRevealArgs = {
  roundId: Id<'rounds'> | undefined
  playerId: Id<'players'> | null
}

export function useMyReveal({ roundId, playerId }: UseMyRevealArgs) {
  const reveal = useQuery(
    api.game.getMyReveal,
    roundId && playerId ? { roundId, playerId } : 'skip',
  )

  return {
    reveal,
    isLoading: Boolean(roundId && playerId) && reveal === undefined,
    notFound: reveal === null,
  }
}
