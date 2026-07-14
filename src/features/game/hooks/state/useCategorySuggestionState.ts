import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'

type CategorySuggestionStateArgs = {
  roomId?: Id<'rooms'>
  roundId?: Id<'rounds'>
  playerId?: Id<'players'> | null
}

export function useCategorySuggestionState({ roomId, roundId, playerId }: CategorySuggestionStateArgs) {
  const suggestionState = useQuery(
    api.game.getCategorySuggestionState,
    roomId && roundId ? { roomId, roundId, playerId: playerId ?? undefined } : 'skip',
  )

  return {
    suggestionState,
    isLoading: Boolean(roomId && roundId) && suggestionState === undefined,
    notFound: suggestionState === null,
  }
}
