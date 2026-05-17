import { ButtonLink } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { PageShell } from '../../../shared/layouts/PageShell'
import { PlayerList } from '../components/PlayerList'
import { RoomCode } from '../components/RoomCode'
import { mockPlayers, mockRoom } from '../data/mockRoom'

export function LobbyPage() {
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
          <RoomCode code={mockRoom.code} />
          <div className="grid gap-5 md:grid-cols-3">
            {[
              ['Category', mockRoom.category, 'category'],
              ['Timer', mockRoom.timer, 'schedule'],
              ['Players', `${mockPlayers.length}/8`, 'groups'],
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
            <ButtonLink to="/room/demo/role" className="py-5 text-base sm:flex-1">
              Start Reveal
            </ButtonLink>
            <ButtonLink to="/" variant="secondary" className="py-5 text-base sm:flex-1">
              Leave Game
            </ButtonLink>
          </div>
        </section>
        <aside className="xl:col-span-4">
          <PlayerList players={mockPlayers} />
        </aside>
      </div>
    </PageShell>
  )
}
