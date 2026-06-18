import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { RoundPlayerIdArgs } from '../../types'

export function useMyReveal({ roundId, playerId }: RoundPlayerIdArgs) {
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
