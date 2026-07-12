import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'

type WordSubmissionStateArgs = {
  roomId?: Id<'rooms'>
  roundId?: Id<'rounds'>
  playerId?: Id<'players'> | null
}

export function useWordSubmissionState({ roomId, roundId, playerId }: WordSubmissionStateArgs) {
  const submissionState = useQuery(
    api.game.getWordSubmissionState,
    roomId && roundId ? { roomId, roundId, playerId: playerId ?? undefined } : 'skip',
  )

  return {
    submissionState,
    isLoading: Boolean(roomId && roundId) && submissionState === undefined,
    notFound: submissionState === null,
  }
}
