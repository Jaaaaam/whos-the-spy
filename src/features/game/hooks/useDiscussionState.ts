import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"

type UseDiscussionStateArgs = {
  roomId: Id<'rooms'> | undefined,
  roundId: Id<'rounds'> | undefined

}

export function useDiscussionState({
  roomId,
  roundId
}: UseDiscussionStateArgs) {
  const discussionState = useQuery(api.game.getDiscussionState, roomId && roundId ? { roomId, roundId } : 'skip')

  return {
    discussionState,
    isLoading: Boolean(roomId && roundId) && discussionState === undefined,
    notFound: discussionState === null
  }
}