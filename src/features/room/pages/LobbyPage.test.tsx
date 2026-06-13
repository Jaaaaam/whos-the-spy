import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { MAX_PLAYERS_PER_ROOM } from '../../../../shared/gameSettings'
import { usePlayersByRoom } from '../hooks/usePlayersByRoom'
import { usePlayerConnection } from '../hooks/usePlayerConnection'
import { useRoomByCode } from '../hooks/useRoomByCode'
import { useStartRound } from '../hooks/useStartRound'
import { saveCurrentPlayerId } from '../lib/currentPlayer'
import { LobbyPage } from './LobbyPage'

vi.mock('../hooks/useRoomByCode')
vi.mock('../hooks/usePlayersByRoom')
vi.mock('../hooks/useStartRound')
vi.mock('../hooks/usePlayerConnection')

const room: Doc<'rooms'> = {
  _id: 'room_1' as Id<'rooms'>,
  _creationTime: 0,
  code: 'SPY247',
  status: GAME_STATUS.LOBBY,
  createdAt: 0,
}

const players: Doc<'players'>[] = [
  {
    _id: 'player_1' as Id<'players'>,
    _creationTime: 0,
    roomId: room._id,
    name: 'Jam',
    isHost: true,
    isConnected: true,
    joinedAt: 0,
  },
  {
    _id: 'player_2' as Id<'players'>,
    _creationTime: 0,
    roomId: room._id,
    name: 'Alex',
    isHost: false,
    isConnected: true,
    joinedAt: 0,
  },
]

const readyPlayers: Doc<'players'>[] = [
  ...players,
  {
    _id: 'player_3' as Id<'players'>,
    _creationTime: 0,
    roomId: room._id,
    name: 'Sam',
    isHost: false,
    isConnected: true,
    joinedAt: 0,
  },
]

function renderLobbyPage() {
  return render(
    <MemoryRouter initialEntries={['/rooms/SPY247']}>
      <Routes>
        <Route path="/rooms/:roomCode" element={<LobbyPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LobbyPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(useStartRound).mockReturnValue({
      startRound: vi.fn(),
      isStarting: false,
      error: null,
    })
    vi.mocked(usePlayerConnection).mockReturnValue({
      reconnectPlayer: vi.fn().mockResolvedValue(null),
      disconnectPlayer: vi.fn().mockResolvedValue(null),
    })
  })

  it('shows the current player count with the shared room limit', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room,
      isLoading: false,
      notFound: false,
    })
    vi.mocked(usePlayersByRoom).mockReturnValue({
      players,
      isLoading: false,
      isEmpty: false,
    })

    renderLobbyPage()

    expect(screen.getByText(`${players.length}/${MAX_PLAYERS_PER_ROOM}`)).toBeInTheDocument()
  })

  it('counts only connected players as active in the lobby summary', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room,
      isLoading: false,
      notFound: false,
    })
    vi.mocked(usePlayersByRoom).mockReturnValue({
      players: [
        ...players,
        {
          _id: 'player_3' as Id<'players'>,
          _creationTime: 0,
          roomId: room._id,
          name: 'Mika',
          isHost: false,
          isConnected: false,
          joinedAt: 0,
        },
      ],
      isLoading: false,
      isEmpty: false,
    })

    renderLobbyPage()

    expect(screen.getByText(`${players.length}/${MAX_PLAYERS_PER_ROOM}`)).toBeInTheDocument()
    expect(screen.getAllByText('Disconnected')).toHaveLength(2)
  })

  it('reconnects a saved current player when the lobby opens', async () => {
    const reconnectPlayer = vi.fn().mockResolvedValue(null)

    saveCurrentPlayerId(players[0]._id)
    vi.mocked(useRoomByCode).mockReturnValue({
      room,
      isLoading: false,
      notFound: false,
    })
    vi.mocked(usePlayersByRoom).mockReturnValue({
      players,
      isLoading: false,
      isEmpty: false,
    })
    vi.mocked(usePlayerConnection).mockReturnValue({
      reconnectPlayer,
      disconnectPlayer: vi.fn().mockResolvedValue(null),
    })

    renderLobbyPage()

    await waitFor(() => {
      expect(reconnectPlayer).toHaveBeenCalledWith(room._id, players[0]._id)
    })
  })

  it('allows the host to start the round when there are enough players', () => {
    const startRound = vi.fn()

    saveCurrentPlayerId(readyPlayers[0]._id)
    vi.mocked(useRoomByCode).mockReturnValue({
      room,
      isLoading: false,
      notFound: false,
    })
    vi.mocked(usePlayersByRoom).mockReturnValue({
      players: readyPlayers,
      isLoading: false,
      isEmpty: false,
    })
    vi.mocked(useStartRound).mockReturnValue({
      startRound,
      isStarting: false,
      error: null,
    })

    renderLobbyPage()

    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }))

    expect(startRound).toHaveBeenCalledWith({ roomId: room._id, hostPlayerId: readyPlayers[0]._id })
  })

  it('does not allow a non-host to start the round', () => {
    const startRound = vi.fn()

    saveCurrentPlayerId(readyPlayers[1]._id)
    vi.mocked(useRoomByCode).mockReturnValue({
      room,
      isLoading: false,
      notFound: false,
    })
    vi.mocked(usePlayersByRoom).mockReturnValue({
      players: readyPlayers,
      isLoading: false,
      isEmpty: false,
    })
    vi.mocked(useStartRound).mockReturnValue({
      startRound,
      isStarting: false,
      error: null,
    })

    renderLobbyPage()

    const startButton = screen.getByRole('button', { name: 'Waiting for Host' })

    expect(startButton).toBeDisabled()
    fireEvent.click(startButton)
    expect(startRound).not.toHaveBeenCalled()
  })

  it('disconnects and clears the saved player when leaving the game', async () => {
    const disconnectPlayer = vi.fn().mockResolvedValue(null)

    saveCurrentPlayerId(readyPlayers[0]._id)
    vi.mocked(useRoomByCode).mockReturnValue({
      room,
      isLoading: false,
      notFound: false,
    })
    vi.mocked(usePlayersByRoom).mockReturnValue({
      players: readyPlayers,
      isLoading: false,
      isEmpty: false,
    })
    vi.mocked(usePlayerConnection).mockReturnValue({
      reconnectPlayer: vi.fn().mockResolvedValue(null),
      disconnectPlayer,
    })

    renderLobbyPage()

    fireEvent.click(screen.getByRole('button', { name: 'Leave Game' }))

    await waitFor(() => {
      expect(disconnectPlayer).toHaveBeenCalledWith(room._id, readyPlayers[0]._id)
    })
    expect(localStorage.getItem('whos-the-spy.currentPlayerId')).toBeNull()
  })
})
