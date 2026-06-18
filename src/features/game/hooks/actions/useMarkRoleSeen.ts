import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState } from "react";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { getConvexErrorMessage } from "../../../../shared/lib/getConvexErrorMessage";

export function useMarkRoleSeen() {
  const markRoleSeenMutation = useMutation(api.game.markRoleSeen)
  const [isMarkingSeen, setIsMarkingSeen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function markRoleSeen(roundId: Id<'rounds'>, playerId: Id<'players'>) {
    setIsMarkingSeen(true)
    setError(null)

    try {
      return await markRoleSeenMutation({ roundId, playerId })
    } catch (error) {
      const message = getConvexErrorMessage(error, 'Unable to mark role as seen.')
      setError(message)
      throw error
    } finally {
      setIsMarkingSeen(false)
    }
  }

  return { markRoleSeen, isMarkingSeen, error }
}
