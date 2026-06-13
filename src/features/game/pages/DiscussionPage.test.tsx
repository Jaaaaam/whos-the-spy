import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { usePlayersByRoom } from '../../room/hooks/usePlayersByRoom'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { clearCurrentPlayerId, saveCurrentPlayerId } from '../../room/lib/currentPlayer'
import { useAdvanceDiscussionIfExpired } from '../hooks/useAdvanceDiscussionIfExpired'
import { useDiscussionState } from '../hooks/useDiscussionState'
import { useEndDiscussionTurn } from '../hooks/useEndDiscussionTurn'
import { useMyReveal } from '../hooks/useMyReveal'
import { DiscussionPage } from './DiscussionPage'

vi.mock('../../room/hooks/useRoomByCode')
vi.mock('../../room/hooks/usePlayersByRoom')
vi.mock('../hooks/useDiscussionState')
vi.mock('../hooks/useEndDiscussionTurn')
vi.mock('../hooks/useAdvanceDiscussionIfExpired')
vi.mock('../hooks/useMyReveal')

const roomId = 'room_1' as Id<'rooms'>
const roundId = 'round_1' as Id<'rounds'>
const playerId = 'player_1' as Id<'players'>
const secondPlayerId = 'player_2' as Id<'players'>

const room: Doc<'rooms'> = {
  _id: roomId,
  _creationTime: 0,
  code: 'SPY247',
  status: GAME_STATUS.DISCUSSION,
  currentRoundId: roundId,
  createdAt: 0,
}

const players: Doc<'players'>[] = [
  {
    _id: playerId,
    _creationTime: 0,
    roomId,
    name: 'Jam',
    isHost: true,
    isConnected: true,
    joinedAt: 0,
  },
  {
    _id: secondPlayerId,
    _creationTime: 0,
    roomId,
    name: 'Mika',
    isHost: false,
    isConnected: true,
    joinedAt: 0,
  },
]

const discussionState = {
  room: {
    code: room.code,
    status: room.status,
  },
  round: {
    roundNumber: 1,
    activePlayerId: playerId,
    activePlayerName: 'Jam',
    currentTurn: 1,
    totalTurns: 2,
    turnStartedAt: 1_000,
    turnEndsAt: 31_000,
  },
}

function renderDiscussionPage() {
  return render(
    <MemoryRouter initialEntries={['/room/SPY247/discussion']}>
      <Routes>
        <Route path="/room/:roomCode/discussion" element={<DiscussionPage />} />
        <Route path="/room/:roomCode/role" element={<div>Role redirect</div>} />
        <Route path="/room/:roomCode/voting" element={<div>Voting redirect</div>} />
        <Route path="/room/:roomCode" element={<div>Lobby redirect</div>} />
        <Route path="/join" element={<div>Join redirect</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DiscussionPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
    localStorage.clear()
    saveCurrentPlayerId(playerId)
    vi.mocked(useRoomByCode).mockReturnValue({
      room,
      isLoading: false,
      notFound: false,
    })
    vi.mocked(useDiscussionState).mockReturnValue({
      discussionState,
      isLoading: false,
      notFound: false,
    })
    vi.mocked(usePlayersByRoom).mockReturnValue({
      players,
      isLoading: false,
      isEmpty: false,
    })
    vi.mocked(useMyReveal).mockReturnValue({
      reveal: { word: 'Sandwich', seenAt: 1 },
      isLoading: false,
      notFound: false,
    })
    vi.mocked(useEndDiscussionTurn).mockReturnValue({
      endDiscussionTurn: vi.fn(),
      isEndingTurn: false,
      error: null,
    })
    vi.mocked(useAdvanceDiscussionIfExpired).mockReturnValue({
      advanceDiscussionIfExpired: vi.fn(),
      isAdvancing: false,
      error: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a loading state while the room is loading', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: undefined,
      isLoading: true,
      notFound: false,
    })

    renderDiscussionPage()

    expect(screen.getByText('Loading room...')).toBeInTheDocument()
  })

  it('redirects to join when the room is not found', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: null,
      isLoading: false,
      notFound: true,
    })

    renderDiscussionPage()

    expect(screen.getByText('Join redirect')).toBeInTheDocument()
  })

  it('redirects to join when there is no current player', () => {
    clearCurrentPlayerId()

    renderDiscussionPage()

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

    renderDiscussionPage()

    expect(screen.getByText('Lobby redirect')).toBeInTheDocument()
  })

  it('redirects to role reveal when the room phase changes back', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: {
        ...room,
        status: GAME_STATUS.ROLE_REVEAL,
      },
      isLoading: false,
      notFound: false,
    })

    renderDiscussionPage()

    expect(screen.getByText('Role redirect')).toBeInTheDocument()
  })

  it('redirects to voting when the room phase changes forward', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: {
        ...room,
        status: GAME_STATUS.VOTING,
      },
      isLoading: false,
      notFound: false,
    })

    renderDiscussionPage()

    expect(screen.getByText('Voting redirect')).toBeInTheDocument()
  })

  it('shows a loading state while discussion data is loading', () => {
    vi.mocked(useDiscussionState).mockReturnValue({
      discussionState: undefined,
      isLoading: true,
      notFound: false,
    })

    renderDiscussionPage()

    expect(screen.getByText('Loading discussion...')).toBeInTheDocument()
  })

  it('redirects to the lobby when discussion state is missing', () => {
    vi.mocked(useDiscussionState).mockReturnValue({
      discussionState: null,
      isLoading: false,
      notFound: true,
    })

    renderDiscussionPage()

    expect(screen.getByText('Lobby redirect')).toBeInTheDocument()
  })

  it('renders the active turn, secret word, and player list', () => {
    renderDiscussionPage()

    expect(screen.getByText('Active Player')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Jam' })).toBeInTheDocument()
    expect(screen.getByText('Turn 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Sandwich')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('Mika')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End My Turn' })).toBeEnabled()
  })

  it('lets the active player end their turn', async () => {
    const endDiscussionTurn = vi.fn().mockResolvedValue({ advanced: true })
    vi.mocked(useEndDiscussionTurn).mockReturnValue({
      endDiscussionTurn,
      isEndingTurn: false,
      error: null,
    })

    renderDiscussionPage()
    fireEvent.click(screen.getByRole('button', { name: 'End My Turn' }))

    expect(endDiscussionTurn).toHaveBeenCalledWith(roomId, roundId, playerId)
  })

  it('disables ending the turn for inactive players', () => {
    vi.mocked(useDiscussionState).mockReturnValue({
      discussionState: {
        ...discussionState,
        round: {
          ...discussionState.round,
          activePlayerId: secondPlayerId,
          activePlayerName: 'Mika',
        },
      },
      isLoading: false,
      notFound: false,
    })

    renderDiscussionPage()

    expect(screen.getByRole('button', { name: 'Waiting for Mika' })).toBeDisabled()
  })

  it('advances discussion when the turn timer expires', async () => {
    const advanceDiscussionIfExpired = vi.fn().mockResolvedValue({ advanced: true })
    vi.mocked(useDiscussionState).mockReturnValue({
      discussionState: {
        ...discussionState,
        round: {
          ...discussionState.round,
          turnEndsAt: 2_000,
        },
      },
      isLoading: false,
      notFound: false,
    })
    vi.mocked(useAdvanceDiscussionIfExpired).mockReturnValue({
      advanceDiscussionIfExpired,
      isAdvancing: false,
      error: null,
    })

    renderDiscussionPage()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })

    expect(advanceDiscussionIfExpired).toHaveBeenCalledWith(roomId, roundId)
  })

  it('shows spectating state for eliminated players with no reveal', () => {
    vi.mocked(useMyReveal).mockReturnValue({
      reveal: null,
      isLoading: false,
      notFound: true,
    })

    renderDiscussionPage()

    expect(screen.getByRole('button', { name: 'Spectating' })).toBeDisabled()
    expect(screen.getByText("You've been eliminated. Watch the discussion unfold.")).toBeInTheDocument()
    expect(screen.getByText('Active Player')).toBeInTheDocument()
  })

  it('shows turn mutation errors', () => {
    vi.mocked(useEndDiscussionTurn).mockReturnValue({
      endDiscussionTurn: vi.fn(),
      isEndingTurn: false,
      error: 'Unable to end discussion turn.',
    })

    renderDiscussionPage()

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to end discussion turn.')
  })
})
