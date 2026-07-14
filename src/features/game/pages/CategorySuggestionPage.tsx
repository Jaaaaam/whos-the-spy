import { useEffect, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { Loader } from '../../../shared/components/Loader'
import { PageShell } from '../../../shared/layouts/PageShell'
import { useHeartbeat } from '../../room/hooks/useHeartbeat'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { getCurrentPlayerId } from '../../room/lib/currentPlayer'
import { PhaseProgress } from '../components/PhaseProgress'
import { useSubmitCategorySuggestion } from '../hooks/actions/useSubmitCategorySuggestion'
import { useAdvanceCategorySuggestionIfExpired } from '../hooks/advance/useAdvanceCategorySuggestionIfExpired'
import { useCategorySuggestionState } from '../hooks/state/useCategorySuggestionState'
import { useNow } from '../hooks/useNow'
import { getPathForStatus } from '../lib/statusRoutes'
import { getSecondsRemaining } from '../lib/timerUtils'

export function CategorySuggestionPage() {
  const { roomCode } = useParams()
  const { room, isLoading: isRoomLoading, notFound } = useRoomByCode(roomCode)
  const currentPlayerId = getCurrentPlayerId()
  useHeartbeat(room?._id, currentPlayerId ?? undefined)
  const { suggestionState, isLoading: isStateLoading } = useCategorySuggestionState({
    roomId: room?._id,
    roundId: room?.currentRoundId,
    playerId: currentPlayerId,
  })
  const { submitCategorySuggestion, isSubmitting, error } = useSubmitCategorySuggestion()
  const { advanceCategorySuggestionIfExpired, isAdvancing, error: advanceError } = useAdvanceCategorySuggestionIfExpired()
  const [text, setText] = useState('')
  const now = useNow()
  const hasRequestedAdvanceRef = useRef(false)
  const secondsRemaining = suggestionState?.suggestionEndsAt
    ? getSecondsRemaining(suggestionState.suggestionEndsAt, now)
    : null

  useEffect(() => {
    hasRequestedAdvanceRef.current = false
  }, [suggestionState?.suggestionEndsAt])

  useEffect(() => {
    if (!room || !room.currentRoundId || room.status !== GAME_STATUS.CATEGORY_SUGGESTION) return
    if (secondsRemaining === null || secondsRemaining > 0 || isAdvancing) return
    if (hasRequestedAdvanceRef.current) return

    hasRequestedAdvanceRef.current = true
    void advanceCategorySuggestionIfExpired(room._id, room.currentRoundId).catch(() => {})
  }, [advanceCategorySuggestionIfExpired, isAdvancing, room, secondsRemaining])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!room?._id || !room.currentRoundId || !currentPlayerId || !text.trim()) return

    await submitCategorySuggestion({
      roomId: room._id,
      roundId: room.currentRoundId,
      playerId: currentPlayerId,
      text: text.trim(),
    }).catch(() => {})
  }

  if (isRoomLoading) {
    return (
      <PageShell compact>
        <Loader fullPage label="Loading room" />
      </PageShell>
    )
  }

  if (notFound || !room || !currentPlayerId) {
    return <Navigate to="/join" replace />
  }

  if (!room.currentRoundId) {
    return <Navigate to={`/room/${room.code}`} replace />
  }

  if (room.status !== GAME_STATUS.CATEGORY_SUGGESTION) {
    return <Navigate to={getPathForStatus(room.status, room.code)} replace />
  }

  if (isStateLoading || !suggestionState) {
    return (
      <PageShell compact>
        <Loader fullPage label="Loading phase" />
      </PageShell>
    )
  }

  return (
    <PageShell compact>
      <div className="py-8">
        <Card tone="glass" className="relative overflow-hidden text-center">
          <div className="absolute inset-0 noise-grid opacity-10" />
          <div className="relative mx-auto max-w-2xl space-y-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.4em] text-tertiary">
                Wordless Spy
              </p>
              <h1 className="mt-4 font-headline text-5xl font-black tracking-tight sm:text-7xl">
                Suggest a Category
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-on-surface-variant">
                Propose a theme for this mission. The room votes on the winning category next.
              </p>
            </div>
            {suggestionState.hasSuggested ? (
              <p className="rounded-[1.5rem] bg-tertiary/10 px-6 py-4 text-sm font-semibold text-tertiary">
                Category locked in. Waiting for the other agents...
              </p>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <input
                  className="w-full rounded-[1.5rem] bg-surface-container-highest/70 px-6 py-4 text-center font-headline text-2xl font-black ring-1 ring-outline-variant/20 focus:outline-none focus:ring-tertiary"
                  maxLength={40}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="e.g. Animals"
                  type="text"
                  value={text}
                />
                <Button disabled={isSubmitting || !text.trim()} type="submit">
                  {isSubmitting ? 'Submitting...' : 'Submit Category'}
                </Button>
              </form>
            )}
            <PhaseProgress
              label="Categories submitted"
              doneCount={suggestionState.suggestedCount}
              totalCount={suggestionState.activePlayerCount}
              secondsRemaining={secondsRemaining}
            />
            {error || advanceError ? (
              <p className="text-sm font-semibold text-error" role="alert">
                {error ?? advanceError}
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
