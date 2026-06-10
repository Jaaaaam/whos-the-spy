import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { getConvexErrorMessage } from "../../../shared/lib/getConvexErrorMessage";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { GAME_ERROR } from "../../../../convex/game/errors";

type FinalizeVotingArgs = {
  roomId: Id<'rooms'>
  roundId: Id<'rounds'>
}

export function useFinalizeVoting() {
  const votingMutation = useMutation(api.game.finalizeVoting)
  const [isFinalizingVote, setIsFinalizingVote] = useState(false);
  const [error, setError] = useState<string | null>(null)

  const finalizeVoting = useCallback(async ({ roomId, roundId }: FinalizeVotingArgs) => {
    setIsFinalizingVote(true)
    setError(null)

    try {
      return await votingMutation({ roomId, roundId })
    } catch (error) {
      const message = getConvexErrorMessage(error, GAME_ERROR.GENERIC_ERROR)
      if (message !== GAME_ERROR.ROOM_NOT_IN_CURRENT_VOTING) {
        setError(message)
      }
      setError(message)
    } finally {
      setIsFinalizingVote(false)
    }

  }, [votingMutation])
  return { finalizeVoting, isFinalizingVote, error }
}