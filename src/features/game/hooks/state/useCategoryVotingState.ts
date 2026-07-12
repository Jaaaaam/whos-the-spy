import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'

type CategoryVotingStateArgs = {
  roomId?: Id<'rooms'>
  roundId?: Id<'rounds'>
  playerId?: Id<'players'> | null
}

export function useCategoryVotingState({ roomId, roundId, playerId }: CategoryVotingStateArgs) {
  const votingState = useQuery(
    api.game.getCategoryVotingState,
    roomId && roundId ? { roomId, roundId, playerId: playerId ?? undefined } : 'skip',
  )

  return {
    votingState,
    isLoading: Boolean(roomId && roundId) && votingState === undefined,
    notFound: votingState === null,
  }
}
