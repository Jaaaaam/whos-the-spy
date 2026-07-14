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
import { useSetRoomMode } from '../hooks/useSetRoomMode'
import { MAX_PLAYERS_PER_ROOM } from '../../../../shared/gameSettings'
import { GAME_MODE, type GameMode } from '../../../../shared/gameMode'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { clearCurrentPlayerId, getCurrentPlayerId } from '../lib/currentPlayer'
import { useHeartbeat } from '../hooks/useHeartbeat'
import { getPathForStatus } from '../../game/lib/statusRoutes'

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
  const { setRoomMode, isSettingMode, error: modeError } = useSetRoomMode()
  const currentPlayerId = getCurrentPlayerId()
  useHeartbeat(room?._id, currentPlayerId ?? undefined)

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
  const currentMode = currentRoom.mode ?? GAME_MODE.SIMILAR_WORDS

  async function handleSetMode(mode: GameMode) {
    if (!isCurrentPlayerHost || !currentPlayer || mode === currentMode) return

    await setRoomMode({ roomId: currentRoom._id, hostPlayerId: currentPlayer._id, mode }).catch(() => {})
  }
  const startButtonLabel = isStarting
    ? 'Starting...'
    : isCurrentPlayerHost
      ? connectedPlayerCount >= 3
        ? 'Start Game'
        : 'Need 3 Players'
      : 'Waiting for Host'

  async function handleStartRound() {
    if (!canStartRound || !currentPlayer) return

    await startRound({ roomId: currentRoom._id, hostPlayerId: currentPlayer._id })
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

  if (currentRoom.status !== GAME_STATUS.LOBBY) {
    return <Navigate to={getPathForStatus(currentRoom.status, currentRoom.code)} replace />
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
            <Card tone="low" className="rounded-[1.5rem]">
              <span className="material-symbols-outlined text-tertiary">stylus_note</span>
              <div className="mt-4 flex items-center gap-1.5">
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Mode
                </p>
                <div className="group relative flex">
                  <span className="material-symbols-outlined cursor-help text-sm text-on-surface-variant/60 hover:text-tertiary" style={{ fontSize: '16px' }}>
                    info
                  </span>
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-[1rem] bg-surface-container-highest p-4 text-left text-xs normal-case tracking-normal text-on-surface opacity-0 shadow-2xl ring-1 ring-outline-variant/20 transition-opacity duration-150 group-hover:opacity-100">
                    <p className="mb-2">
                      <strong className="text-tertiary">Similar Words:</strong> civilians share one word, the spy gets a related-but-different word.
                    </p>
                    <p>
                      <strong className="text-tertiary">Wordless Spy:</strong> players suggest and vote on a category, then submit words under it. One submitted word becomes the secret word — the spy gets none and must blend in.
                    </p>
                  </div>
                </div>
              </div>
              {isCurrentPlayerHost ? (
                <div className="mt-2 flex flex-col gap-2">
                  {([
                    [GAME_MODE.SIMILAR_WORDS, 'Similar Words'],
                    [GAME_MODE.WORDLESS_SPY, 'Wordless Spy'],
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      disabled={isSettingMode}
                      onClick={() => void handleSetMode(mode)}
                      className={`rounded-[1rem] px-4 py-2 text-left text-sm font-bold ring-1 transition ${
                        currentMode === mode
                          ? 'bg-tertiary/20 text-tertiary ring-tertiary/40'
                          : 'text-on-surface-variant ring-outline-variant/20 hover:text-tertiary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 font-headline text-3xl font-black">
                  {currentMode === GAME_MODE.WORDLESS_SPY ? 'Wordless Spy' : 'Similar Words'}
                </p>
              )}
            </Card>
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
          {error || modeError ? (
            <p className="text-sm font-semibold text-error" role="alert">
              {error ?? modeError}
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
