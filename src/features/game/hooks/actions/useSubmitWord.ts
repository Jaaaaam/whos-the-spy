import { useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { getConvexErrorMessage } from '../../../../shared/lib/getConvexErrorMessage'

type SubmitWordArgs = {
  roomId: Id<'rooms'>
  roundId: Id<'rounds'>
  playerId: Id<'players'>
  word: string
}

export function useSubmitWord() {
  const submitMutation = useMutation(api.game.submitWord)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitWord(args: SubmitWordArgs) {
    setIsSubmitting(true)
    setError(null)

    try {
      return await submitMutation(args)
    } catch (error) {
      setError(getConvexErrorMessage(error, 'Unable to submit word.'))
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  return { submitWord, isSubmitting, error }
}
