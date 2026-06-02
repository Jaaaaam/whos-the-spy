import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { saveCurrentPlayerId } from '../../room/lib/currentPlayer'
import { useMyReveal } from '../hooks/useMyReveal'
import { RoleRevealPage } from './RoleRevealPage'

vi.mock('../../room/hooks/useRoomByCode')
vi.mock('../hooks/useMyReveal')

const roomId = 'room_1' as Id<'rooms'>
const roundId = 'round_1' as Id<'rounds'>
const playerId = 'player_1' as Id<'players'>

const room: Doc<'rooms'> = {
  _id: roomId,
  _creationTime: 0,
  code: 'SPY247',
  status: 'role_reveal',
  currentRoundId: roundId,
  createdAt: 0,
}

function renderRoleRevealPage() {
  return render(
    <MemoryRouter initialEntries={['/room/SPY247/role']}>
      <Routes>
        <Route path="/room/:roomCode/role" element={<RoleRevealPage />} />
        <Route path="/room/:roomCode" element={<div>Lobby redirect</div>} />
        <Route path="/join" element={<div>Join redirect</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RoleRevealPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    saveCurrentPlayerId(playerId)
    vi.mocked(useRoomByCode).mockReturnValue({
      room,
      isLoading: false,
      notFound: false,
    })
    vi.mocked(useMyReveal).mockReturnValue({
      reveal: { word: 'Sandwich' },
      isLoading: false,
      notFound: false,
    })
  })

  it('shows a loading state while the room is loading', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: undefined,
      isLoading: true,
      notFound: false,
    })

    renderRoleRevealPage()

    expect(screen.getByText('Loading Room...')).toBeInTheDocument()
  })

  it('redirects to join when the room is not found', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: null,
      isLoading: false,
      notFound: true,
    })

    renderRoleRevealPage()

    expect(screen.getByText('Join redirect')).toBeInTheDocument()
  })

  it('redirects to join when there is no current player', () => {
    sessionStorage.clear()

    renderRoleRevealPage()

    expect(screen.getByText('Join redirect')).toBeInTheDocument()
  })

  it('redirects back to the lobby when there is no active round', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: {
        ...room,
        currentRoundId: undefined,
      },
      isLoading: false,
      notFound: false,
    })

    renderRoleRevealPage()

    expect(screen.getByText('Lobby redirect')).toBeInTheDocument()
  })

  it('shows a loading state while the player reveal is loading', () => {
    vi.mocked(useMyReveal).mockReturnValue({
      reveal: undefined,
      isLoading: true,
      notFound: false,
    })

    renderRoleRevealPage()

    expect(screen.getByText('Loading your word...')).toBeInTheDocument()
  })

  it('shows an error when the current player has no reveal', () => {
    vi.mocked(useMyReveal).mockReturnValue({
      reveal: null,
      isLoading: false,
      notFound: true,
    })

    renderRoleRevealPage()

    expect(screen.getByRole('heading', { name: 'Word not found' })).toBeInTheDocument()
  })

  it('reveals the current player secret word', () => {
    renderRoleRevealPage()

    expect(screen.getByRole('heading', { name: 'Keep It Quiet' })).toBeInTheDocument()
    expect(screen.getByText('Sandwich')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'I Understand' })).toHaveAttribute(
      'href',
      '/room/SPY247/discussion',
    )
  })

  it('does not reveal whether the current player is spy or civilian', () => {
    vi.mocked(useMyReveal).mockReturnValue({
      reveal: { word: 'Burger' },
      isLoading: false,
      notFound: false,
    })

    renderRoleRevealPage()

    expect(screen.getByText('Burger')).toBeInTheDocument()
    expect(screen.queryByText('YOU ARE THE SPY')).not.toBeInTheDocument()
    expect(screen.queryByText('YOU ARE A VILLAGER')).not.toBeInTheDocument()
  })
})
