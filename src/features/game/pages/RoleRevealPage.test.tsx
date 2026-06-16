import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { clearCurrentPlayerId, saveCurrentPlayerId } from '../../room/lib/currentPlayer'
import { useAdvanceRevealIfExpired } from '../hooks/useAdvanceRevealIfExpired'
import { useMarkRoleSeen } from '../hooks/useMarkRoleSeen'
import { useMyReveal } from '../hooks/useMyReveal'
import { useRevealState } from '../hooks/useRevealState'
import { RoleRevealPage } from './RoleRevealPage'

vi.mock('../../room/hooks/useRoomByCode')
vi.mock('../hooks/useMyReveal')
vi.mock('../hooks/useMarkRoleSeen')
vi.mock('../hooks/useRevealState')
vi.mock('../hooks/useAdvanceRevealIfExpired')

const roomId = 'room_1' as Id<'rooms'>
const roundId = 'round_1' as Id<'rounds'>
const playerId = 'player_1' as Id<'players'>

const room: Doc<'rooms'> = {
  _id: roomId,
  _creationTime: 0,
  code: 'SPY247',
  status: GAME_STATUS.ROLE_REVEAL,
  currentRoundId: roundId,
  createdAt: 0,
}

const round: Doc<'rounds'> = {
  _id: roundId,
  _creationTime: 0,
  roomId,
  mode: 'similar_words',
  civilianWord: 'Burger',
  spyWord: 'Sandwich',
  spyCount: 1,
  roundNumber: 1,
  startedAt: 0,
  revealEndsAt: Date.now() + 30_000,
}

function renderRoleRevealPage() {
  return render(
    <MemoryRouter initialEntries={['/room/SPY247/role']}>
      <Routes>
        <Route path="/room/:roomCode/role" element={<RoleRevealPage />} />
        <Route path="/room/:roomCode/discussion" element={<div>Discussion redirect</div>} />
        <Route path="/room/:roomCode" element={<div>Lobby redirect</div>} />
        <Route path="/join" element={<div>Join redirect</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RoleRevealPage', () => {
  beforeEach(() => {
    localStorage.clear()
    saveCurrentPlayerId(playerId)
    vi.mocked(useRoomByCode).mockReturnValue({
      room,
      isLoading: false,
      notFound: false,
    })
    vi.mocked(useMyReveal).mockReturnValue({
      reveal: { word: 'Sandwich', seenAt: undefined },
      isLoading: false,
      notFound: false,
    })
    vi.mocked(useMarkRoleSeen).mockReturnValue({
      markRoleSeen: vi.fn(),
      isMarkingSeen: false,
      error: null,
    })
    vi.mocked(useRevealState).mockReturnValue({
      revealState: {
        roundNumber: round.roundNumber,
        revealEndsAt: round.revealEndsAt,
      },
      isLoading: false,
      notFound: false,
    })
    vi.mocked(useAdvanceRevealIfExpired).mockReturnValue({
      advanceRevealIfExpired: vi.fn(),
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

    renderRoleRevealPage()

    expect(screen.getByText('Loading room')).toBeInTheDocument()
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
    clearCurrentPlayerId()

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

  it('redirects to discussion when the room phase changes', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: {
        ...room,
        status: GAME_STATUS.DISCUSSION,
      },
      isLoading: false,
      notFound: false,
    })

    renderRoleRevealPage()

    expect(screen.getByText('Discussion redirect')).toBeInTheDocument()
  })

  it('shows a loading state while the player reveal is loading', () => {
    vi.mocked(useMyReveal).mockReturnValue({
      reveal: undefined,
      isLoading: true,
      notFound: false,
    })

    renderRoleRevealPage()

    expect(screen.getByText('Loading your word')).toBeInTheDocument()
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
    expect(screen.getByText('Discussion starts in')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'I Understand' })).toBeEnabled()
  })

  it('marks the current player role as seen', async () => {
    const markRoleSeen = vi.fn().mockResolvedValue({ seenAt: 1 })
    vi.mocked(useMarkRoleSeen).mockReturnValue({
      markRoleSeen,
      isMarkingSeen: false,
      error: null,
    })

    renderRoleRevealPage()
    fireEvent.click(screen.getByRole('button', { name: 'I Understand' }))

    await waitFor(() => {
      expect(markRoleSeen).toHaveBeenCalledWith(roundId, playerId)
    })
  })

  it('shows a waiting state when the role has already been seen', () => {
    vi.mocked(useMyReveal).mockReturnValue({
      reveal: { word: 'Sandwich', seenAt: 1 },
      isLoading: false,
      notFound: false,
    })

    renderRoleRevealPage()

    expect(screen.getByText('Ready. Waiting for the rest of the players...')).toBeInTheDocument()
    expect(screen.getByText('Discussion starts in')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'I Understand' })).not.toBeInTheDocument()
  })

  it('advances the reveal when the timer expires', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
    const advanceRevealIfExpired = vi.fn().mockResolvedValue({ advanced: true })
    vi.mocked(useRevealState).mockReturnValue({
      revealState: {
        roundNumber: round.roundNumber,
        revealEndsAt: 2_000,
      },
      isLoading: false,
      notFound: false,
    })
    vi.mocked(useAdvanceRevealIfExpired).mockReturnValue({
      advanceRevealIfExpired,
      isAdvancing: false,
      error: null,
    })

    renderRoleRevealPage()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })

    expect(advanceRevealIfExpired).toHaveBeenCalledWith(roomId, roundId)
  })

  it('shows a mutation error and keeps the acknowledgement button available', () => {
    vi.mocked(useMarkRoleSeen).mockReturnValue({
      markRoleSeen: vi.fn(),
      isMarkingSeen: false,
      error: 'Unable to mark role as seen.',
    })

    renderRoleRevealPage()

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to mark role as seen.')
    expect(screen.getByRole('button', { name: 'I Understand' })).toBeEnabled()
  })

  it('does not reveal whether the current player is spy or civilian', () => {
    vi.mocked(useMyReveal).mockReturnValue({
      reveal: { word: 'Burger', seenAt: undefined },
      isLoading: false,
      notFound: false,
    })

    renderRoleRevealPage()

    expect(screen.getByText('Burger')).toBeInTheDocument()
    expect(screen.queryByText('YOU ARE THE SPY')).not.toBeInTheDocument()
    expect(screen.queryByText('YOU ARE A VILLAGER')).not.toBeInTheDocument()
  })
})
