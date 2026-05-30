import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { MAX_PLAYERS_PER_ROOM } from '../../../../shared/gameSettings'
import { usePlayersByRoom } from '../hooks/usePlayersByRoom'
import { useRoomByCode } from '../hooks/useRoomByCode'
import { useStartRound } from '../hooks/useStartRound'
import { saveCurrentPlayerId } from '../lib/currentPlayer'
import { LobbyPage } from './LobbyPage'

vi.mock('../hooks/useRoomByCode')
vi.mock('../hooks/usePlayersByRoom')
vi.mock('../hooks/useStartRound')

const room: Doc<'rooms'> = {
  _id: 'room_1' as Id<'rooms'>,
  _creationTime: 0,
  code: 'SPY247',
  status: 'lobby',
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
    sessionStorage.clear()
    vi.mocked(useStartRound).mockReturnValue({
      startRound: vi.fn(),
      isStarting: false,
      error: null,
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

    expect(startRound).toHaveBeenCalledWith(room._id, readyPlayers[0]._id)
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
})
