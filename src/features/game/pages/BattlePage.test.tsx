import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { clearCurrentPlayerId, saveCurrentPlayerId } from '../../room/lib/currentPlayer'
import { useBattleState } from '../hooks/useBattleState'
import { BattlePage } from './BattlePage'

vi.mock('../../room/hooks/useRoomByCode')
vi.mock('../hooks/useBattleState')

const roomId = 'room_1' as Id<'rooms'>
const roundId = 'round_1' as Id<'rounds'>
const playerId = 'player_1' as Id<'players'>

const room: Doc<'rooms'> = {
  _id: roomId,
  _creationTime: 0,
  code: 'SPY247',
  status: GAME_STATUS.BATTLE,
  currentRoundId: roundId,
  createdAt: 0,
}

const tiedPlayers: Doc<'players'>[] = [
  {
    _id: 'player_2' as Id<'players'>,
    _creationTime: 0,
    roomId,
    name: 'Mika',
    isHost: false,
    isConnected: true,
    joinedAt: 0,
  },
  {
    _id: 'player_3' as Id<'players'>,
    _creationTime: 0,
    roomId,
    name: 'Dani',
    isHost: false,
    isConnected: true,
    joinedAt: 0,
  },
]

function renderBattlePage() {
  return render(
    <MemoryRouter initialEntries={['/room/SPY247/battle']}>
      <Routes>
        <Route path="/room/:roomCode/battle" element={<BattlePage />} />
        <Route path="/room/:roomCode/role" element={<div>Role redirect</div>} />
        <Route path="/room/:roomCode/discussion" element={<div>Discussion redirect</div>} />
        <Route path="/room/:roomCode/voting" element={<div>Voting redirect</div>} />
        <Route path="/room/:roomCode/results" element={<div>Results redirect</div>} />
        <Route path="/room/:roomCode" element={<div>Lobby redirect</div>} />
        <Route path="/join" element={<div>Join redirect</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BattlePage', () => {
  beforeEach(() => {
    localStorage.clear()
    saveCurrentPlayerId(playerId)
    vi.mocked(useRoomByCode).mockReturnValue({
      room,
      isLoading: false,
      notFound: false,
    })
    vi.mocked(useBattleState).mockReturnValue({
      battleState: { tiedPlayers },
      isLoading: false,
    })
  })

  it('shows a loading state while the room is loading', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: undefined,
      isLoading: true,
      notFound: false,
    })

    renderBattlePage()

    expect(screen.getByText('Loading room')).toBeInTheDocument()
  })

  it('redirects to join when the room is not found', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: null,
      isLoading: false,
      notFound: true,
    })

    renderBattlePage()

    expect(screen.getByText('Join redirect')).toBeInTheDocument()
  })

  it('redirects to join when there is no current player', () => {
    clearCurrentPlayerId()

    renderBattlePage()

    expect(screen.getByText('Join redirect')).toBeInTheDocument()
  })

  it('redirects to lobby when there is no active round', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: { ...room, currentRoundId: undefined },
      isLoading: false,
      notFound: false,
    })

    renderBattlePage()

    expect(screen.getByText('Lobby redirect')).toBeInTheDocument()
  })

  it('redirects to role reveal when room status is ROLE_REVEAL', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: { ...room, status: GAME_STATUS.ROLE_REVEAL },
      isLoading: false,
      notFound: false,
    })

    renderBattlePage()

    expect(screen.getByText('Role redirect')).toBeInTheDocument()
  })

  it('redirects to discussion when room status is DISCUSSION', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: { ...room, status: GAME_STATUS.DISCUSSION },
      isLoading: false,
      notFound: false,
    })

    renderBattlePage()

    expect(screen.getByText('Discussion redirect')).toBeInTheDocument()
  })

  it('redirects to voting when room status is VOTING', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: { ...room, status: GAME_STATUS.VOTING },
      isLoading: false,
      notFound: false,
    })

    renderBattlePage()

    expect(screen.getByText('Voting redirect')).toBeInTheDocument()
  })

  it('redirects to results when room status is RESULTS', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: { ...room, status: GAME_STATUS.RESULTS },
      isLoading: false,
      notFound: false,
    })

    renderBattlePage()

    expect(screen.getByText('Results redirect')).toBeInTheDocument()
  })

  it('redirects to lobby when room status is LOBBY', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: { ...room, status: GAME_STATUS.LOBBY },
      isLoading: false,
      notFound: false,
    })

    renderBattlePage()

    expect(screen.getByText('Lobby redirect')).toBeInTheDocument()
  })

  it('shows a loading state while battle data is loading', () => {
    vi.mocked(useBattleState).mockReturnValue({
      battleState: undefined,
      isLoading: true,
    })

    renderBattlePage()

    expect(screen.getByText('Loading battle')).toBeInTheDocument()
  })

  it('renders the showdown heading', () => {
    renderBattlePage()

    expect(screen.getByRole('heading', { name: /the showdown/i })).toBeInTheDocument()
  })

  it('renders the decision deadlock badge', () => {
    renderBattlePage()

    expect(screen.getByText('Decision Deadlock')).toBeInTheDocument()
  })

  it('renders both tied player names', () => {
    renderBattlePage()

    expect(screen.getByRole('heading', { name: 'Mika' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dani' })).toBeInTheDocument()
  })

  it('renders a Tied badge for each suspect', () => {
    renderBattlePage()

    expect(screen.getAllByText('Tied')).toHaveLength(2)
  })
})
