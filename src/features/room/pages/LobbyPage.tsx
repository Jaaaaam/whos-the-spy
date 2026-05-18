import { Link, useParams } from 'react-router-dom'
import { ButtonLink } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { PageShell } from '../../../shared/layouts/PageShell'
import { PlayerList } from '../components/PlayerList'
import { RoomCode } from '../components/RoomCode'
import { mockRoom } from '../data/mockRoom'
import { usePlayersByRoom } from '../hooks/usePlayersByRoom'
import { useRoomByCode } from '../hooks/useRoomByCode'

export function LobbyPage() {
  const { roomCode } = useParams()
  const { room, isLoading: isRoomLoading, notFound } = useRoomByCode(roomCode)
  const {
    players,
    isLoading: arePlayersLoading,
    isEmpty,
  } = usePlayersByRoom(room?._id)

  if (isRoomLoading) {
    return (
      <PageShell>
        <div className="py-12 text-center text-on-surface-variant">Loading lobby...</div>
      </PageShell>
    )
  }

  if (notFound || !room) {
    return (
      <PageShell compact>
        <Card className="my-8 space-y-5 text-center">
          <h1 className="font-headline text-4xl font-black">Room not found</h1>
          <p className="text-on-surface-variant">
            Check the private code and try joining again.
          </p>
          <ButtonLink to="/join">Join Another Room</ButtonLink>
        </Card>
      </PageShell>
    )
  }

  const playerCount = players?.length ?? 0

  return (
    <PageShell>
      <div className="grid gap-8 py-8 xl:grid-cols-12">
        <section className="space-y-8 xl:col-span-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-tertiary">
              Lobby
            </p>
            <h1 className="mt-4 font-headline text-5xl font-black tracking-tight sm:text-7xl">
              Waiting for Agents
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-on-surface-variant">
              Share the room code, confirm settings, and start the reveal when everyone
              is ready.
            </p>
          </div>
          <RoomCode code={room.code} />
          <div className="grid gap-5 md:grid-cols-3">
            {[
              ['Category', mockRoom.category, 'category'],
              ['Timer', mockRoom.timer, 'schedule'],
              ['Players', arePlayersLoading ? '...' : `${playerCount}/8`, 'groups'],
            ].map(([label, value, icon]) => (
              <Card key={label} tone="low" className="rounded-[1.5rem]">
                <span className="material-symbols-outlined text-tertiary">{icon}</span>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  {label}
                </p>
                <p className="mt-1 font-headline text-3xl font-black">{value}</p>
              </Card>
            ))}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-surface-container-highest px-6 py-5 font-headline text-base font-extrabold uppercase tracking-widest text-on-surface-variant opacity-70 ring-1 ring-outline-variant/10 sm:flex-1"
              disabled
              type="button"
            >
              Start Game Soon
            </button>
            <ButtonLink to="/" variant="secondary" className="py-5 text-base sm:flex-1">
              Leave Game
            </ButtonLink>
          </div>
        </section>
        <aside className="xl:col-span-4">
          {arePlayersLoading ? (
            <Card className="text-center text-on-surface-variant">Loading players...</Card>
          ) : (
            <PlayerList players={players ?? []} isEmpty={isEmpty} />
          )}
          <Link
            className="mt-4 block text-center text-xs font-bold uppercase tracking-widest text-tertiary"
            to={`/join`}
          >
            Open Join Screen
          </Link>
        </aside>
      </div>
    </PageShell>
  )
}
