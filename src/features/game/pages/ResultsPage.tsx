import { Navigate, useParams } from 'react-router-dom'
import { ButtonLink } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { PageShell } from '../../../shared/layouts/PageShell'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { useResultsState } from '../hooks/useResultsState'
import { GAME_STATUS } from '../../../../shared/gameStatus'

export function ResultsPage() {
  const { roomCode } = useParams()
  const { room, isLoading: isRoomLoading, notFound: isRoomNotFound } = useRoomByCode(roomCode)

  const { resultsState, isLoading: isResultsLoading } = useResultsState({
    roomId: room?._id,
    roundId: room?.status === GAME_STATUS.RESULTS && room?.currentRoundId ? room.currentRoundId : undefined,
  })

  if (isRoomLoading || isResultsLoading) {
    return (
      <PageShell compact>
        <Card className="my-8 text-center text-on-surface-variant">
          Loading results...
        </Card>
      </PageShell>
    )
  }

  if (isRoomNotFound || !room) {
    return <Navigate to="/join" replace />
  }

  if (!resultsState) {
    return (
      <PageShell compact>
        <Card className="my-8 text-center text-on-surface-variant">
          Loading results...
        </Card>
      </PageShell>
    )
  }

  const didSpyCatchSelf = resultsState.isEliminatedPlayerSpy

  const initials = resultsState.eliminatedPlayerName
    ? resultsState.eliminatedPlayerName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??'

  return (
    <PageShell>
      <section className="relative py-8 text-center">
        <div className="absolute left-1/2 top-0 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className={`inline-flex rounded-full px-5 py-2 text-xs font-bold uppercase tracking-[0.25em] ring-1 ${didSpyCatchSelf ? 'bg-error-container/20 text-error ring-error/20' : 'bg-primary-container/20 text-primary ring-primary/20'}`}>
          {didSpyCatchSelf ? 'Threat Neutralized' : 'Infiltration Successful'}
        </div>
        <h1 className="mt-5 font-headline text-5xl font-extrabold tracking-tight drop-shadow-[0_0_30px_rgba(253,111,133,0.25)] sm:text-7xl">
          {didSpyCatchSelf ? 'SPY ELIMINATED!' : 'SPY WINS!'}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-on-surface-variant">
          {didSpyCatchSelf
            ? 'The village is safe. The infiltrator was identified before the final accusation could bend the room.'
            : 'The spy outmaneuvered the village. Better luck next time.'}
        </p>
      </section>

      <div className="grid gap-6 pb-10 md:grid-cols-12">
        <Card tone="glass" className="relative overflow-hidden md:col-span-8">
          <div className="absolute right-6 top-4 opacity-5">
            <span className="material-symbols-outlined text-[10rem]">fingerprint</span>
          </div>
          <div className="relative flex flex-col items-center gap-8 md:flex-row">
            <div className="relative">
              <div className="flex h-36 w-36 items-center justify-center rounded-[2rem] bg-gradient-to-br from-error to-primary font-headline text-5xl font-black text-surface shadow-[0_0_40px_rgba(161,142,255,0.18)] sm:h-48 sm:w-48">
                {initials}
              </div>
              <div className="absolute -bottom-2 -right-2 rounded-full bg-error p-3 ring-4 ring-surface-container">
                <span className="material-symbols-outlined text-surface">close</span>
              </div>
            </div>
            <div className="text-center md:text-left">
              <p className="text-sm font-bold uppercase tracking-widest text-tertiary">
                Identity Exposed
              </p>
              <h2 className="mt-2 font-headline text-4xl font-bold sm:text-5xl">
                {resultsState.eliminatedPlayerName}
              </h2>
              <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
                <span className="rounded-full bg-secondary-container px-4 py-1 text-xs font-bold uppercase tracking-widest text-on-secondary-container">
                  {didSpyCatchSelf ? 'Spy' : 'Civilian'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 md:col-span-4">
          <Card tone="high" className="rounded-[2rem]">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Villager Word
            </p>
            <div className="mt-3 font-headline text-4xl font-black text-primary">
              {resultsState.civilianWord}
            </div>
            <p className="mt-2 text-sm text-on-surface-variant">Assigned to the citizens</p>
          </Card>
          <Card tone="high" className="rounded-[2rem]">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Spy Word
            </p>
            <div className="mt-3 font-headline text-4xl font-black text-error">
              {resultsState.spyWord}
            </div>
            <p className="mt-2 text-sm text-on-surface-variant">Assigned to the spy</p>
          </Card>
        </div>

        {resultsState.votingHistory.length > 0 && (
          <Card tone="low" className="md:col-span-12">
            <h2 className="mb-6 font-headline text-xl font-bold">Voting History</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {resultsState.votingHistory.map((vote, index) => (
                <div
                  key={index}
                  className="rounded-[1.25rem] bg-surface-container p-4"
                >
                  <p className="font-headline font-bold">{vote.voterName}</p>
                  <p className="mt-1 text-xs font-medium text-error">
                    Voted for: {vote.targetName}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="mx-auto flex max-w-md flex-col gap-4 pb-8 sm:flex-row">
        <ButtonLink to="/create" className="flex-1 py-5">
          New Game
        </ButtonLink>
        <ButtonLink to={`/room/${room.code}`} variant="secondary" className="flex-1 py-5">
          Lobby
        </ButtonLink>
      </div>
    </PageShell>
  )
}
