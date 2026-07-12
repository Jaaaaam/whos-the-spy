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
import { useSubmitWord } from '../hooks/actions/useSubmitWord'
import { useAdvanceWordSubmissionIfExpired } from '../hooks/advance/useAdvanceWordSubmissionIfExpired'
import { useWordSubmissionState } from '../hooks/state/useWordSubmissionState'
import { useNow } from '../hooks/useNow'
import { getPathForStatus } from '../lib/statusRoutes'
import { getSecondsRemaining } from '../lib/timerUtils'

export function WordSubmissionPage() {
  const { roomCode } = useParams()
  const { room, isLoading: isRoomLoading, notFound } = useRoomByCode(roomCode)
  const currentPlayerId = getCurrentPlayerId()
  useHeartbeat(room?._id, currentPlayerId ?? undefined)
  const { submissionState, isLoading: isStateLoading } = useWordSubmissionState({
    roomId: room?._id,
    roundId: room?.currentRoundId,
    playerId: currentPlayerId,
  })
  const { submitWord, isSubmitting, error } = useSubmitWord()
  const { advanceWordSubmissionIfExpired, isAdvancing, error: advanceError } = useAdvanceWordSubmissionIfExpired()
  const [word, setWord] = useState('')
  const now = useNow()
  const hasRequestedAdvanceRef = useRef(false)
  const secondsRemaining = submissionState?.wordSubmissionEndsAt
    ? getSecondsRemaining(submissionState.wordSubmissionEndsAt, now)
    : null

  useEffect(() => {
    hasRequestedAdvanceRef.current = false
  }, [submissionState?.wordSubmissionEndsAt])

  useEffect(() => {
    if (!room || !room.currentRoundId || room.status !== GAME_STATUS.WORD_SUBMISSION) return
    if (secondsRemaining === null || secondsRemaining > 0 || isAdvancing) return
    if (hasRequestedAdvanceRef.current) return

    hasRequestedAdvanceRef.current = true
    void advanceWordSubmissionIfExpired(room._id, room.currentRoundId).catch(() => {})
  }, [advanceWordSubmissionIfExpired, isAdvancing, room, secondsRemaining])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!room?._id || !room.currentRoundId || !currentPlayerId || !word.trim()) return

    await submitWord({
      roomId: room._id,
      roundId: room.currentRoundId,
      playerId: currentPlayerId,
      word: word.trim(),
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

  if (room.status !== GAME_STATUS.WORD_SUBMISSION) {
    return <Navigate to={getPathForStatus(room.status, room.code)} replace />
  }

  if (isStateLoading || !submissionState) {
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
                Submit a Word
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-on-surface-variant">
                One submitted word becomes the secret word. Choose wisely.
              </p>
            </div>
            <div className="rounded-[2rem] bg-surface-container-highest/70 p-8 ring-1 ring-outline-variant/20">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-on-surface-variant">
                Category
              </p>
              <div className="mt-3 font-headline text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-on-surface-variant sm:text-7xl">
                {submissionState.category}
              </div>
            </div>
            {submissionState.hasSubmitted ? (
              <p className="rounded-[1.5rem] bg-tertiary/10 px-6 py-4 text-sm font-semibold text-tertiary">
                Word locked in. Waiting for the other agents...
              </p>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <input
                  className="w-full rounded-[1.5rem] bg-surface-container-highest/70 px-6 py-4 text-center font-headline text-2xl font-black ring-1 ring-outline-variant/20 focus:outline-none focus:ring-tertiary"
                  maxLength={40}
                  onChange={(event) => setWord(event.target.value)}
                  placeholder="Your word"
                  type="text"
                  value={word}
                />
                <Button disabled={isSubmitting || !word.trim()} type="submit">
                  {isSubmitting ? 'Submitting...' : 'Submit Word'}
                </Button>
              </form>
            )}
            <PhaseProgress
              label="Words submitted"
              doneCount={submissionState.submittedCount}
              totalCount={submissionState.activePlayerCount}
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
