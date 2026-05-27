import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { MAX_PLAYERS_PER_ROOM } from '../../../../shared/gameSettings'
import { usePlayersByRoom } from '../hooks/usePlayersByRoom'
import { useRoomByCode } from '../hooks/useRoomByCode'
import { LobbyPage } from './LobbyPage'

vi.mock('../hooks/useRoomByCode')
vi.mock('../hooks/usePlayersByRoom')

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
})
