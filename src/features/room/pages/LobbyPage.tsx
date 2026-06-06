import { useEffect } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button, ButtonLink } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { PageShell } from '../../../shared/layouts/PageShell'
import { PlayerList } from '../components/PlayerList'
import { RoomCode } from '../components/RoomCode'
import { mockRoom } from '../data/mockRoom'
import { useStartRound } from '../hooks/useStartRound'
import { usePlayersByRoom } from '../hooks/usePlayersByRoom'
import { usePlayerConnection } from '../hooks/usePlayerConnection'
import { useRoomByCode } from '../hooks/useRoomByCode'
import { MAX_PLAYERS_PER_ROOM } from '../../../../shared/gameSettings'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { clearCurrentPlayerId, getCurrentPlayerId } from '../lib/currentPlayer'

export function LobbyPage() {
  const { roomCode } = useParams()
  const navigate = useNavigate()
  const { room, isLoading: isRoomLoading, notFound } = useRoomByCode(roomCode)
  const {
    players,
    isLoading: arePlayersLoading,
    isEmpty,
  } = usePlayersByRoom(room?._id)
  const { startRound, isStarting, error } = useStartRound()
  const { reconnectPlayer, disconnectPlayer } = usePlayerConnection()
  const currentPlayerId = getCurrentPlayerId()

  useEffect(() => {
    if (!room?._id || !currentPlayerId) return

    void reconnectPlayer(room._id, currentPlayerId).catch((error) => {
      console.error('[Convex] reconnect player failed', error)
    })
  }, [currentPlayerId, reconnectPlayer, room?._id])

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

  const currentRoom = room
  const connectedPlayerCount = players?.filter((player) => player.isConnected).length ?? 0
  const currentPlayer = players?.find((player) => player._id === currentPlayerId)
  const isCurrentPlayerHost = currentPlayer?.isHost ?? false
  const canStartRound =
    isCurrentPlayerHost && Boolean(currentPlayer?.isConnected) && connectedPlayerCount >= 3 && !arePlayersLoading
  const startButtonLabel = isStarting
    ? 'Starting...'
    : isCurrentPlayerHost
      ? connectedPlayerCount >= 3
        ? 'Start Game'
        : 'Need 3 Players'
      : 'Waiting for Host'

  async function handleStartRound() {
    if (!canStartRound || !currentPlayer) return

    await startRound(currentRoom._id, currentPlayer._id)
  }

  async function handleLeaveGame() {
    if (currentPlayerId) {
      await disconnectPlayer(currentRoom._id, currentPlayerId).catch((error) => {
        console.error('[Convex] disconnect player failed', error)
      })
    }

    clearCurrentPlayerId()
    navigate('/')
  }

  if (currentRoom.status === GAME_STATUS.ROLE_REVEAL) {
    return <Navigate to={`/room/${currentRoom.code}/role`} replace />
  }

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
          <RoomCode code={currentRoom.code} />
          <div className="grid gap-5 md:grid-cols-3">
            {[
              ['Category', mockRoom.category, 'category'],
              ['Timer', mockRoom.timer, 'schedule'],
              ['Players', arePlayersLoading ? '...' : `${connectedPlayerCount}/${MAX_PLAYERS_PER_ROOM}`, 'groups'],
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
            <Button
              className="py-5 text-base sm:flex-1"
              disabled={!canStartRound || isStarting}
              onClick={handleStartRound}
              type="button"
            >
              {startButtonLabel}
            </Button>
            <Button
              className="py-5 text-base sm:flex-1"
              onClick={handleLeaveGame}
              type="button"
              variant="secondary"
            >
              Leave Game
            </Button>
          </div>
          {error ? (
            <p className="text-sm font-semibold text-error" role="alert">
              {error}
            </p>
          ) : null}
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
