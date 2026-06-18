import { useMutation } from "convex/react";
import { useState } from "react";
import type { RoomHostArgs } from "../../types";
import { getConvexErrorMessage } from "../../../../shared/lib/getConvexErrorMessage";
import { api } from "../../../../../convex/_generated/api";

export function usePlayAgain() {
  const playAgainMutation = useMutation(api.game.playAgain)
  const [isPlayingAgain, setIsPlayingAgain] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function playAgain({ roomId, hostPlayerId }: RoomHostArgs) {
    setIsPlayingAgain(true)

    try {
      const result = await playAgainMutation({ roomId, hostPlayerId })
      return result
    } catch (error) {
      setError(getConvexErrorMessage(error))
      return null
    } finally {
      setIsPlayingAgain(false)
    }
  }

  return { playAgain, isPlayingAgain, error }
}