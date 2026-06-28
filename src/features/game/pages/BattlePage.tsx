import { Fragment, useEffect, useRef } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Loader } from '../../../shared/components/Loader'
import { PageShell } from '../../../shared/layouts/PageShell'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { getCurrentPlayerId } from '../../room/lib/currentPlayer'
import { useHeartbeat } from '../../room/hooks/useHeartBeat'
import { useBattleState } from '../hooks/state/useBattleState'
import { useAdvanceBattleIfExpired } from '../hooks/advance/useAdvanceBattleIfExpired'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { SuspectCard } from '../components/SuspectCard'
import { VsDivider } from '../components/VsDivider'
import { Timer } from '../components/Timer'
import { useNow } from '../hooks/useNow'
import { getSecondsRemaining, formatSeconds, getTimerProgress } from '../lib/timerUtils'

const BATTLE_DURATION_MS = 30_000

export function BattlePage() {
  const hasRequestedAdvanceRef = useRef(false)
  const { roomCode } = useParams()
  const currentPlayerId = getCurrentPlayerId()
  const { room, isLoading: isRoomLoading, notFound: isRoomNotFound } = useRoomByCode(roomCode)
  useHeartbeat(room?._id, currentPlayerId ?? undefined)
  const { battleState, isLoading: isBattleLoading } = useBattleState({
    roomId: room?._id,
    roundId: room?.currentRoundId,
  })
  const { advanceBattleIfExpired, isAdvancing } = useAdvanceBattleIfExpired()

  const now = useNow()

  const battleEndsAt = battleState?.battleEndsAt ?? null
  const secondsRemaining = battleEndsAt ? getSecondsRemaining(battleEndsAt, now) : 0
  const timerProgress = battleEndsAt ? getTimerProgress(battleEndsAt, BATTLE_DURATION_MS, now) : 100
  const isTimerUrgent = secondsRemaining <= 10

  useEffect(() => { hasRequestedAdvanceRef.current = false }, [battleEndsAt])

  useEffect(() => {
    if (!room || !room.currentRoundId || room.status !== GAME_STATUS.BATTLE) return
    if (!battleEndsAt) return
    if (secondsRemaining > 0 || isAdvancing) return
    if (hasRequestedAdvanceRef.current) return

    hasRequestedAdvanceRef.current = true
    void advanceBattleIfExpired(room._id, room.currentRoundId).catch(() => {
      hasRequestedAdvanceRef.current = false
    })
  }, [advanceBattleIfExpired, isAdvancing, room, secondsRemaining, battleEndsAt])

  if (isRoomLoading) {
    return (
      <PageShell compact>
        <Loader fullPage label="Loading room" />
      </PageShell>
    )
  }

  if (isRoomNotFound || !room || !currentPlayerId) {
    return <Navigate to="/join" replace />
  }

  if (!room.currentRoundId) {
    return <Navigate to={`/room/${room.code}`} replace />
  }

  if (room.status === GAME_STATUS.ROLE_REVEAL) {
    return <Navigate to={`/room/${room.code}/role`} replace />
  }

  if (room.status === GAME_STATUS.DISCUSSION) {
    return <Navigate to={`/room/${room.code}/discussion`} replace />
  }

  if (room.status === GAME_STATUS.VOTING) {
    return <Navigate to={`/room/${room.code}/voting`} replace />
  }

  if (room.status === GAME_STATUS.RESULTS) {
    return <Navigate to={`/room/${room.code}/results`} replace />
  }

  if (room.status === GAME_STATUS.LOBBY) {
    return <Navigate to={`/room/${room.code}`} replace />
  }

  if (isBattleLoading) {
    return (
      <PageShell compact>
        <Loader fullPage label="Loading battle" />
      </PageShell>
    )
  }

  const tiedPlayers = battleState?.tiedPlayers ?? []

  return (
    <PageShell showFooter={false}>
      <div className="flex min-h-[calc(100vh-7rem)] flex-col items-center justify-center gap-12 py-12">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex animate-pulse items-center gap-2 rounded-full bg-error/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.25em] text-error ring-1 ring-error/20">
            <span className="material-symbols-outlined text-sm">warning</span>
            Decision Deadlock
          </div>
          <h1 className="mt-5 font-headline text-5xl font-black uppercase tracking-tighter sm:text-7xl">
            The Showdown
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-on-surface-variant">
            Prepare for final cross-examination.{' '}
            <strong className="text-tertiary">Suspects only transmit next round.</strong>
          </p>
        </div>

        {/* Timer */}
        {battleEndsAt ? (
          <div className="w-full max-w-xs">
            <Timer
              label="Time remaining"
              value={formatSeconds(secondsRemaining)}
              progress={timerProgress}
              urgent={isTimerUrgent}
            />
          </div>
        ) : null}

        {/* VS layout */}
        <div className="flex w-full max-w-4xl flex-wrap items-center justify-center md:flex-row md:gap-0">
          {tiedPlayers.map((player, i) => (
            <Fragment key={player._id}>
              {i > 0 && <VsDivider />}
              <SuspectCard name={player.name} />
            </Fragment>
          ))}
        </div>

        {/* Phase chips */}
        <div className="flex gap-3 opacity-50">
          <span className="rounded-full bg-secondary-container px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-on-secondary-container">
            Encrypted Channel
          </span>
          <span className="rounded-full bg-surface-container-high px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-tertiary ring-1 ring-tertiary/20">
            Phase: Confrontation
          </span>
        </div>

      </div>
    </PageShell>
  )
}
