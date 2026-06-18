import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { RoomRoundIdArgs } from '../types'

export function useDiscussionState({
  roomId,
  roundId
}: RoomRoundIdArgs) {
  const discussionState = useQuery(api.game.getDiscussionState, roomId && roundId ? { roomId, roundId } : 'skip')

  return {
    discussionState,
    isLoading: Boolean(roomId && roundId) && discussionState === undefined,
    notFound: discussionState === null
  }
}
