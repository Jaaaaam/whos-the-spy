import { useEffect, useRef } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import type { Id } from '../../../../convex/_generated/dataModel'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { Card } from '../../../shared/components/Card'
import { Loader } from '../../../shared/components/Loader'
import { PageShell } from '../../../shared/layouts/PageShell'
import { useHeartbeat } from '../../room/hooks/useHeartbeat'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { getCurrentPlayerId } from '../../room/lib/currentPlayer'
import { PhaseProgress } from '../components/PhaseProgress'
import { useCastCategoryVote } from '../hooks/actions/useCastCategoryVote'
import { useAdvanceCategoryVotingIfExpired } from '../hooks/advance/useAdvanceCategoryVotingIfExpired'
import { useCategoryVotingState } from '../hooks/state/useCategoryVotingState'
import { useNow } from '../hooks/useNow'
import { getPathForStatus } from '../lib/statusRoutes'
import { getSecondsRemaining } from '../lib/timerUtils'

export function CategoryVotingPage() {
  const { roomCode } = useParams()
  const { room, isLoading: isRoomLoading, notFound } = useRoomByCode(roomCode)
  const currentPlayerId = getCurrentPlayerId()
  useHeartbeat(room?._id, currentPlayerId ?? undefined)
  const { votingState, isLoading: isStateLoading } = useCategoryVotingState({
    roomId: room?._id,
    roundId: room?.currentRoundId,
    playerId: currentPlayerId,
  })
  const { castCategoryVote, isCastingVote, error } = useCastCategoryVote()
  const { advanceCategoryVotingIfExpired, isAdvancing, error: advanceError } = useAdvanceCategoryVotingIfExpired()
  const now = useNow()
  const hasRequestedAdvanceRef = useRef(false)
  const secondsRemaining = votingState?.categoryVoteEndsAt
    ? getSecondsRemaining(votingState.categoryVoteEndsAt, now)
    : null

  useEffect(() => {
    hasRequestedAdvanceRef.current = false
  }, [votingState?.categoryVoteEndsAt])

  useEffect(() => {
    if (!room || !room.currentRoundId || room.status !== GAME_STATUS.CATEGORY_VOTING) return
    if (secondsRemaining === null || secondsRemaining > 0 || isAdvancing) return
    if (hasRequestedAdvanceRef.current) return

    hasRequestedAdvanceRef.current = true
    void advanceCategoryVotingIfExpired(room._id, room.currentRoundId).catch(() => {})
  }, [advanceCategoryVotingIfExpired, isAdvancing, room, secondsRemaining])

  async function handleVote(suggestionId: Id<'categorySuggestions'>) {
    if (!room?._id || !room.currentRoundId || !currentPlayerId) return
    await castCategoryVote({
      roomId: room._id,
      roundId: room.currentRoundId,
      voterPlayerId: currentPlayerId,
      suggestionId,
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

  if (room.status !== GAME_STATUS.CATEGORY_VOTING) {
    return <Navigate to={getPathForStatus(room.status, room.code)} replace />
  }

  if (isStateLoading || !votingState) {
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
                Vote for a Category
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-on-surface-variant">
                Pick the theme for this mission. You cannot vote for your own suggestion.
              </p>
            </div>
            <div className="space-y-3">
              {votingState.suggestions.map((suggestion) => {
                const isSelected = votingState.myVoteSuggestionId === suggestion.suggestionId
                return (
                  <button
                    key={suggestion.suggestionId}
                    type="button"
                    disabled={suggestion.isMine || isCastingVote}
                    onClick={() => void handleVote(suggestion.suggestionId)}
                    className={`w-full rounded-[1.5rem] px-6 py-4 text-left font-headline text-2xl font-black ring-1 transition ${
                      isSelected
                        ? 'bg-tertiary/20 text-tertiary ring-tertiary/40'
                        : suggestion.isMine
                          ? 'text-on-surface-variant/50 ring-outline-variant/10'
                          : 'bg-surface-container-highest/70 ring-outline-variant/20 hover:ring-tertiary'
                    }`}
                  >
                    {suggestion.text}
                    {suggestion.isMine ? (
                      <span className="ml-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                        Yours
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
            <PhaseProgress
              label="Votes cast"
              doneCount={votingState.votedCount}
              totalCount={votingState.activePlayerCount}
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
