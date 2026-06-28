import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Button, ButtonLink } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { Loader } from '../../../shared/components/Loader'
import { PageShell } from '../../../shared/layouts/PageShell'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { getCurrentPlayerId } from '../../room/lib/currentPlayer'
import { useHeartbeat } from '../../room/hooks/useHeartbeat'
import { useStartRound } from '../../room/hooks/useStartRound'
import { useResultsState } from '../hooks/state/useResultsState'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { usePlayAgain } from '../hooks/actions/usePlayAgain'

const NEXT_ROUND_COUNTDOWN_SECONDS = 5

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export function ResultsPage() {
  const { roomCode } = useParams()
  const { room, isLoading: isRoomLoading, notFound: isRoomNotFound } = useRoomByCode(roomCode)
  const { resultsState, isLoading: isResultsLoading } = useResultsState({
    roomId: room?._id,
    roundId: room?.status === GAME_STATUS.RESULTS && room?.currentRoundId ? room.currentRoundId : undefined,
  })
  const { startRound } = useStartRound()
  const { playAgain, isPlayingAgain } = usePlayAgain()

  const [countdown, setCountdown] = useState(NEXT_ROUND_COUNTDOWN_SECONDS)

  const isGameOver = resultsState?.isGameOver ?? true
  const currentPlayerId = getCurrentPlayerId()
  useHeartbeat(room?._id, currentPlayerId ?? undefined)
  const isHost = !!room?.hostPlayerId && currentPlayerId === room.hostPlayerId

  useEffect(() => {
    if (isGameOver || !resultsState || !room) return
    if (countdown <= 0) {
      if (isHost) startRound({ roomId: room._id, hostPlayerId: room.hostPlayerId! })
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [isGameOver, resultsState, room, countdown, isHost, startRound])

  const voteCounts = useMemo(() => {
    if (!resultsState) return new Map<string, number>()
    const counts = new Map<string, number>()
    resultsState.votingHistory.forEach(({ targetName }) => {
      if (targetName) counts.set(targetName, (counts.get(targetName) ?? 0) + 1)
    })
    return counts
  }, [resultsState])

  if (isRoomLoading || isResultsLoading) {
    return <PageShell compact><Loader fullPage label="Loading results" /></PageShell>
  }

  if (isRoomNotFound || !room) return <Navigate to="/join" replace />

  if (room.status === GAME_STATUS.ROLE_REVEAL) return <Navigate to={`/room/${room.code}/role`} replace />
  if (room.status === GAME_STATUS.DISCUSSION) return <Navigate to={`/room/${room.code}/discussion`} replace />
  if (room.status === GAME_STATUS.VOTING) return <Navigate to={`/room/${room.code}/voting`} replace />
  if (room.status === GAME_STATUS.LOBBY) return <Navigate to={`/room/${room.code}`} replace />

  if (!resultsState) {
    return <PageShell compact><Loader fullPage label="Loading results" /></PageShell>
  }

  // ─── State 1: No elimination, game continues ───────────────────────────────
  if (!isGameOver && !resultsState.hadElimination) {
    return (
      <PageShell compact>
        <div className="fixed top-20 left-0 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        <section className="py-12 text-center">
          <h1 className="font-headline text-6xl md:text-8xl font-black tracking-tighter text-primary [text-shadow:0_0_30px_rgba(161,142,255,0.5)] uppercase animate-pulse">
            NO VERDICT
          </h1>
          <p className="mt-4 text-lg text-on-surface-variant tracking-wide max-w-xl mx-auto">
            The consensus was shattered. Doubts lingered like fog in the alleyways.{' '}
            <strong className="text-tertiary">The spy remains in the shadows.</strong>
          </p>
        </section>

        {resultsState.votingHistory.length > 0 && (
          <div className="mx-auto max-w-4xl mb-10">
            <h3 className="font-headline text-xl font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">history</span>
              Voting History
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {resultsState.votingHistory.map((vote, i) => (
                <div key={i} className="bg-surface-container/60 p-5 rounded-xl border border-outline-variant/10 hover:bg-surface-bright transition-colors">
                  <p className="font-headline font-bold text-sm">{vote.voterName}</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {vote.targetName ? `→ ${vote.targetName}` : 'Abstained'}
                  </p>
                  <div className="mt-3 h-1 rounded-full bg-surface-container-highest overflow-hidden">
                    <div
                      className={`h-full rounded-full ${vote.targetName ? 'bg-primary-container' : 'bg-outline-variant/30'}`}
                      style={{ width: vote.targetName ? '100%' : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="w-1.5 h-1.5 bg-tertiary rounded-full animate-ping inline-block" />
            Next round starting in {countdown} second{countdown !== 1 ? 's' : ''}…
          </p>
        </div>
      </PageShell>
    )
  }

  // ─── State 2: Viewer is the eliminated civilian ────────────────────────────
  if (
    !isGameOver &&
    resultsState.hadElimination &&
    currentPlayerId === resultsState.eliminatedPlayerId &&
    !resultsState.isEliminatedPlayerSpy
  ) {
    const myName = resultsState.eliminatedPlayerName ?? 'You'
    const myInitials = getInitials(myName)
    const totalCastVotes = resultsState.votingHistory.filter((v) => v.targetName).length
    const topVotees = [...voteCounts.entries()].sort((a, b) => b[1] - a[1])

    return (
      <PageShell compact>
        <div className="fixed top-20 right-0 w-96 h-96 bg-error/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="fixed bottom-0 left-0 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        <section className="py-10 text-center">
          <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tighter text-error [text-shadow:0_0_30px_rgba(253,111,133,0.5),0_0_60px_rgba(253,111,133,0.2)] uppercase animate-pulse">
            IDENTITY COMPROMISED
          </h1>
          <p className="mt-4 text-lg text-on-surface-variant tracking-wide max-w-xl mx-auto">
            Your transmission has been terminated by the majority.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-4 bg-surface-container/60 rounded-xl border border-outline-variant/10 p-8 flex flex-col items-center text-center shadow-2xl">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-error/20 blur-2xl rounded-full" />
              <div className="relative w-40 h-40 rounded-[2rem] border-4 border-error/50 flex items-center justify-center bg-gradient-to-br from-surface-container-high to-surface-container font-headline text-5xl font-black text-on-surface-variant grayscale">
                {myInitials}
                <div className="absolute inset-0 flex items-center justify-center rounded-[1.75rem] bg-surface-container/60">
                  <span className="material-symbols-outlined text-6xl text-error" style={{ fontVariationSettings: "'FILL' 1" }}>close</span>
                </div>
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-error text-surface px-4 py-1 rounded-full font-bold text-[10px] tracking-widest uppercase whitespace-nowrap shadow-lg shadow-error/40">
                Disconnected
              </div>
            </div>

            <h2 className="font-headline text-2xl font-bold mb-1">{myName}</h2>
            <p className="text-tertiary text-sm font-medium tracking-widest uppercase mb-6">Civilian</p>

            <div className="w-full space-y-3 pt-6 border-t border-outline-variant/10 text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant uppercase tracking-wide">Elimination Type</span>
                <span className="font-bold">Voting Outcast</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant uppercase tracking-wide">Votes Received</span>
                <span className="font-bold text-error">{voteCounts.get(myName) ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 bg-surface-container/60 rounded-xl border border-outline-variant/10 p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-headline text-xl font-bold flex items-center gap-3">
                <span className="material-symbols-outlined text-tertiary">analytics</span>
                Voting Distribution
              </h3>
              <span className="text-xs text-on-surface-variant bg-surface-container-highest px-3 py-1 rounded-full">
                This Round
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
              {topVotees.map(([name, count]) => {
                const pct = totalCastVotes > 0 ? Math.round((count / totalCastVotes) * 100) : 0
                const isMe = name === myName
                return (
                  <div key={name} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className={`font-bold text-sm ${isMe ? 'text-error' : 'text-on-surface'}`}>
                        {name}{isMe ? ' (You)' : ''}
                      </span>
                      <span className={`text-xl font-black ${isMe ? 'text-error' : 'text-on-surface-variant'}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-surface-container-highest overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isMe ? 'bg-error' : 'bg-primary-container'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {resultsState.votingHistory.filter((v) => !v.targetName).length > 0 && (
              <p className="mt-6 text-xs text-on-surface-variant/60">
                {resultsState.votingHistory.filter((v) => !v.targetName).length} player{resultsState.votingHistory.filter((v) => !v.targetName).length !== 1 ? 's' : ''} abstained.
              </p>
            )}

            <div className="mt-8 pt-6 border-t border-outline-variant/10 flex items-center gap-3 text-xs text-on-surface-variant/60">
              <span className="material-symbols-outlined text-sm">security</span>
              <p>All votes are anonymous and final. The game continues without you.</p>
            </div>
          </div>
        </div>

        {resultsState.votingHistory.length > 0 && (
          <div className="mb-10">
            <h3 className="font-headline text-xl font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">history</span>
              Voting History
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {resultsState.votingHistory.map((vote, i) => {
                const isVotedMe = vote.targetName === myName
                return (
                  <div key={i} className="bg-surface-container/60 p-5 rounded-xl border border-outline-variant/10 hover:bg-surface-bright transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-surface-container-highest ${isVotedMe ? 'text-error' : vote.targetName ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                          {vote.targetName ? 'how_to_reg' : 'block'}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-tighter ${isVotedMe ? 'text-error' : 'text-on-surface-variant'}`}>
                        {isVotedMe ? 'Voted You' : vote.targetName ? 'Other' : 'Skip'}
                      </span>
                    </div>
                    <p className="font-headline font-bold text-sm">{vote.voterName}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {vote.targetName ? `→ ${vote.targetName}` : 'Abstained'}
                    </p>
                    <div className="mt-3 h-1 rounded-full bg-surface-container-highest overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isVotedMe ? 'bg-error animate-pulse' : vote.targetName ? 'bg-tertiary/40' : 'bg-outline-variant/30'}`}
                        style={{ width: vote.targetName ? '100%' : '0%' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="w-1.5 h-1.5 bg-tertiary rounded-full animate-ping inline-block" />
            Next round starting in {countdown} second{countdown !== 1 ? 's' : ''}…
          </p>
        </div>
      </PageShell>
    )
  }

  // ─── State 3: Another player eliminated, game continues ────────────────────
  if (!isGameOver && resultsState.hadElimination) {
    const eliminatedName = resultsState.eliminatedPlayerName ?? 'A player'
    const initials = getInitials(eliminatedName)
    const eliminatedVotes = voteCounts.get(eliminatedName) ?? 0

    return (
      <PageShell compact>
        <div className="fixed top-20 left-0 w-96 h-96 bg-error/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="fixed bottom-0 right-0 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        <section className="py-10 text-center">
          <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tighter text-error [text-shadow:0_0_30px_rgba(253,111,133,0.5),0_0_60px_rgba(253,111,133,0.2)] uppercase animate-pulse">
            VILLAGER ELIMINATED
          </h1>
          <p className="mt-4 text-lg text-on-surface-variant tracking-wide">
            The Spy remains in the shadows.
          </p>
        </section>

        <div className="mx-auto max-w-3xl mb-12 scale-[1.02]">
          <div className="bg-surface-container rounded-xl border border-outline-variant/20 p-8 shadow-2xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-error/30 to-transparent" />

            <div className="relative shrink-0">
              <div className="w-36 h-36 rounded-full border-4 border-error/50 flex items-center justify-center bg-gradient-to-br from-surface-container-high to-surface-container font-headline text-5xl font-black text-on-surface-variant/50 grayscale">
                {initials}
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-error px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-lg shadow-error/40">
                Terminated
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <span className="text-tertiary text-xs font-bold tracking-[0.2em] uppercase">Status Report</span>
              <h2 className="font-headline text-3xl font-bold mt-1">{eliminatedName}</h2>
              <div className="mt-4 bg-error/10 border border-error/20 p-3 rounded-lg flex items-center gap-3">
                <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                <span className="text-error font-black text-sm tracking-tight uppercase">
                  Incorrect Identification — Civilian
                </span>
              </div>
              <div className="mt-4 flex gap-3 justify-center md:justify-start">
                <span className="bg-surface-container-highest px-3 py-1 rounded-full text-xs text-on-surface-variant border border-outline-variant/10">
                  {eliminatedVotes} Vote{eliminatedVotes !== 1 ? 's' : ''} Received
                </span>
              </div>
            </div>
          </div>
        </div>

        {resultsState.votingHistory.length > 0 && (
          <div className="mx-auto max-w-5xl mb-10">
            <h3 className="font-headline text-xl font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">history</span>
              Voting History
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {resultsState.votingHistory.map((vote, i) => {
                const isVotedEliminated = vote.targetName === eliminatedName
                return (
                  <div key={i} className="bg-surface-container/60 p-5 rounded-xl border border-outline-variant/10 hover:bg-surface-bright transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-surface-container-highest ${isVotedEliminated ? 'text-error' : vote.targetName ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                          {vote.targetName ? 'how_to_reg' : 'block'}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-tighter ${isVotedEliminated ? 'text-error' : 'text-on-surface-variant'}`}>
                        {isVotedEliminated ? 'Eliminated' : vote.targetName ? 'Other' : 'Skip'}
                      </span>
                    </div>
                    <p className="font-headline font-bold text-sm">{vote.voterName}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {vote.targetName ? `→ ${vote.targetName}` : 'Abstained'}
                    </p>
                    <div className="mt-3 h-1 rounded-full bg-surface-container-highest overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isVotedEliminated ? 'bg-error animate-pulse' : vote.targetName ? 'bg-tertiary/40' : 'bg-outline-variant/30'}`}
                        style={{ width: vote.targetName ? '100%' : '0%' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="w-1.5 h-1.5 bg-tertiary rounded-full animate-ping inline-block" />
            Next round starting in {countdown} second{countdown !== 1 ? 's' : ''}…
          </p>
        </div>
      </PageShell>
    )
  }

  // ─── State 4: Game over ────────────────────────────────────────────────────
  const didSpyCatchSelf = resultsState.isEliminatedPlayerSpy
  const eliminatedName = resultsState.eliminatedPlayerName ?? '??'
  const initials = eliminatedName !== '??' ? getInitials(eliminatedName) : '??'
  const eliminatedVotes = voteCounts.get(eliminatedName) ?? 0
  const totalCastVotes = resultsState.votingHistory.filter((v) => v.targetName).length
  const topVotees = [...voteCounts.entries()].sort((a, b) => b[1] - a[1])

  return (
    <PageShell>
      <div className="fixed top-20 left-0 w-96 h-96 bg-error/10 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <section className="py-10 text-center">
        <div className={`inline-flex rounded-full px-5 py-2 text-xs font-bold uppercase tracking-[0.25em] ring-1 mb-4 ${didSpyCatchSelf ? 'bg-error-container/20 text-error ring-error/20' : 'bg-primary-container/20 text-primary ring-primary/20'}`}>
          {didSpyCatchSelf ? 'Threat Neutralized' : 'Infiltration Successful'}
        </div>
        <h1 className={`font-headline text-5xl md:text-7xl font-black tracking-tighter uppercase ${didSpyCatchSelf ? 'text-error [text-shadow:0_0_30px_rgba(253,111,133,0.5)]' : 'text-primary [text-shadow:0_0_30px_rgba(161,142,255,0.5)]'}`}>
          {didSpyCatchSelf ? 'SPY EXPOSED!' : 'SPY WINS!'}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-on-surface-variant">
          {didSpyCatchSelf
            ? 'The spy has been exposed. The village is safe.'
            : 'The spy outmaneuvered the village. Better luck next time.'}
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <div className="lg:col-span-4 bg-surface-container/60 rounded-xl border border-outline-variant/10 p-8 flex flex-col items-center text-center shadow-2xl">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-error/20 blur-2xl rounded-full" />
            <div className="relative w-40 h-40 rounded-[2rem] border-4 border-error/50 flex items-center justify-center bg-gradient-to-br from-surface-container-high to-surface-container font-headline text-5xl font-black text-on-surface-variant/50 grayscale">
              {initials}
              <div className="absolute inset-0 flex items-center justify-center rounded-[1.75rem] bg-surface-container/60">
                <span className="material-symbols-outlined text-6xl text-error" style={{ fontVariationSettings: "'FILL' 1" }}>close</span>
              </div>
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-error text-surface px-4 py-1 rounded-full font-bold text-[10px] tracking-widest uppercase whitespace-nowrap shadow-lg shadow-error/40">
              {didSpyCatchSelf ? 'Exposed' : 'Eliminated'}
            </div>
          </div>

          <h2 className="font-headline text-2xl font-bold mb-1">{eliminatedName}</h2>
          <p className="text-tertiary text-sm font-medium tracking-widest uppercase mb-6">
            {didSpyCatchSelf ? 'The Spy' : 'Civilian'}
          </p>

          <div className="w-full space-y-3 pt-6 border-t border-outline-variant/10 text-xs">
            <div className="flex justify-between">
              <span className="text-on-surface-variant uppercase tracking-wide">Votes Received</span>
              <span className="font-bold">{eliminatedVotes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant uppercase tracking-wide">Outcome</span>
              <span className={`font-bold ${didSpyCatchSelf ? 'text-error' : 'text-primary'}`}>
                {didSpyCatchSelf ? 'Spy Caught' : 'Spy Wins'}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-surface-container/60 rounded-xl border border-outline-variant/10 p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-headline text-xl font-bold flex items-center gap-3">
              <span className="material-symbols-outlined text-tertiary">analytics</span>
              Voting Distribution
            </h3>
            <span className="text-xs text-on-surface-variant bg-surface-container-highest px-3 py-1 rounded-full">
              Final Results
            </span>
          </div>

          {topVotees.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
              {topVotees.map(([name, count]) => {
                const pct = totalCastVotes > 0 ? Math.round((count / totalCastVotes) * 100) : 0
                const isEliminated = name === eliminatedName
                return (
                  <div key={name} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className={`font-bold text-sm ${isEliminated ? 'text-error' : 'text-on-surface'}`}>
                        {name}{isEliminated ? ' (Eliminated)' : ''}
                      </span>
                      <span className={`text-xl font-black ${isEliminated ? 'text-error' : 'text-on-surface-variant'}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-surface-container-highest overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isEliminated ? 'bg-error' : 'bg-primary-container'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-on-surface-variant text-sm">No votes were cast this round.</p>
          )}

          <div className="mt-8 pt-6 border-t border-outline-variant/10 flex items-center gap-3 text-xs text-on-surface-variant/60">
            <span className="material-symbols-outlined text-sm">security</span>
            <p>All votes are anonymous and final. Majority rule protocol enforced.</p>
          </div>
        </div>
      </div>

      {resultsState.votingHistory.length > 0 && (
        <div className="mx-auto max-w-5xl mb-10">
          <h3 className="font-headline text-xl font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary">history</span>
            Voting History
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {resultsState.votingHistory.map((vote, i) => {
              const isVotedEliminated = vote.targetName === eliminatedName
              return (
                <div key={i} className="bg-surface-container/60 p-5 rounded-xl border border-outline-variant/10 hover:bg-surface-bright transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-surface-container-highest ${isVotedEliminated ? 'text-error' : vote.targetName ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        {vote.targetName ? 'how_to_reg' : 'block'}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-tighter ${isVotedEliminated ? 'text-error' : 'text-on-surface-variant'}`}>
                      {isVotedEliminated ? (didSpyCatchSelf ? 'Exposed' : 'Eliminated') : vote.targetName ? 'Other' : 'Skip'}
                    </span>
                  </div>
                  <p className="font-headline font-bold text-sm">{vote.voterName}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {vote.targetName ? `→ ${vote.targetName}` : 'Abstained'}
                  </p>
                  <div className="mt-3 h-1 rounded-full bg-surface-container-highest overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isVotedEliminated ? 'bg-error animate-pulse' : vote.targetName ? 'bg-tertiary/40' : 'bg-outline-variant/30'}`}
                      style={{ width: vote.targetName ? '100%' : '0%' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <Card tone="high" className="rounded-[2rem]">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Civilian Word</p>
          <div className="mt-3 font-headline text-4xl font-black text-primary">{resultsState.civilianWord}</div>
          <p className="mt-2 text-sm text-on-surface-variant">Assigned to the citizens</p>
        </Card>
        <Card tone="high" className="rounded-[2rem]">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Spy Word</p>
          <div className="mt-3 font-headline text-4xl font-black text-error">{resultsState.spyWord}</div>
          <p className="mt-2 text-sm text-on-surface-variant">Assigned to the spy</p>
        </Card>
      </div>

      <div className="mx-auto flex max-w-md flex-col gap-4 pb-8 sm:flex-row">
        {isHost && (
          <Button
            onClick={() => playAgain({ roomId: room._id, hostPlayerId: room.hostPlayerId! })}
            disabled={isPlayingAgain}
            className="flex-1 py-5"
          >
            {isPlayingAgain ? 'Starting…' : 'Play Again'}
          </Button>
        )}
        <ButtonLink to="/create" variant="secondary" className="flex-1 py-5">
          New Room
        </ButtonLink>
      </div>
    </PageShell>
  )
}
