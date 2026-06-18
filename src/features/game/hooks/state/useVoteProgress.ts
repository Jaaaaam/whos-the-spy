import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { VoteProgressIdArgs } from '../types'

export function useVoteProgress({
  roomId,
  roundId,
  voterPlayerId,
}: VoteProgressIdArgs) {
  const voteProgress = useQuery(
    api.game.getVoteProgress,
    roomId && roundId
      ? { roomId, roundId, voterPlayerId: voterPlayerId ?? undefined }
      : 'skip',
  )

  return {
    voteProgress,
    isLoading: Boolean(roomId && roundId) && voteProgress === undefined,
    notFound: voteProgress === null,
  }
}
