import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { useStartRound } from '../../room/hooks/useStartRound'
import { getCurrentPlayerId } from '../../room/lib/currentPlayer'
import { useResultsState } from '../hooks/useResultsState'
import { usePlayAgain } from '../hooks/usePlayAgain'
import { ResultsPage } from './ResultsPage'

vi.mock('../../room/hooks/useRoomByCode')
vi.mock('../hooks/useResultsState')
vi.mock('../../room/hooks/useStartRound')
vi.mock('../../room/lib/currentPlayer')
vi.mock('../hooks/usePlayAgain')

const roomId = 'room_1' as Id<'rooms'>
const roundId = 'round_1' as Id<'rounds'>
const hostPlayerId = 'host_player' as Id<'players'>

const room: Doc<'rooms'> = {
  _id: roomId,
  _creationTime: 0,
  code: 'SPY247',
  status: GAME_STATUS.RESULTS,
  currentRoundId: roundId,
  hostPlayerId,
  createdAt: 0,
}

const resultsState = {
  civilianWord: 'Jollibee',
  spyWord: "McDonald's",
  eliminatedPlayerName: 'Mika',
  isEliminatedPlayerSpy: true,
  didSpyWin: false,
  isGameOver: true,
  hadElimination: true,
  votingHistory: [
    { voterName: 'Jam', targetName: 'Mika' },
    { voterName: 'Dani', targetName: 'Mika' },
    { voterName: 'Mika', targetName: 'Jam' },
  ],
}

function renderResultsPage() {
  return render(
    <MemoryRouter initialEntries={['/room/SPY247/results']}>
      <Routes>
        <Route path="/room/:roomCode/results" element={<ResultsPage />} />
        <Route path="/join" element={<div>Join redirect</div>} />
        <Route path="/room/:roomCode" element={<div>Lobby redirect</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ResultsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(useRoomByCode).mockReturnValue({ room, isLoading: false, notFound: false })
    vi.mocked(useResultsState).mockReturnValue({ resultsState, isLoading: false })
    vi.mocked(useStartRound).mockReturnValue({ startRound: vi.fn(), isStarting: false, error: null })
    vi.mocked(usePlayAgain).mockReturnValue({ playAgain: vi.fn(), isPlayingAgain: false, error: null })
    vi.mocked(getCurrentPlayerId).mockReturnValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows loading state while room is loading', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: undefined,
      isLoading: true,
      notFound: false,
    })

    renderResultsPage()

    expect(screen.getByText('Loading results')).toBeInTheDocument()
  })

  it('redirects to join when room is not found', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: null,
      isLoading: false,
      notFound: true,
    })

    renderResultsPage()

    expect(screen.getByText('Join redirect')).toBeInTheDocument()
  })

  it('shows loading state while results are loading', () => {
    vi.mocked(useResultsState).mockReturnValue({
      resultsState: undefined,
      isLoading: true,
    })

    renderResultsPage()

    expect(screen.getByText('Loading results')).toBeInTheDocument()
  })

  it('shows spy caught outcome when spy was eliminated', () => {
    renderResultsPage()

    expect(screen.getByText('SPY ELIMINATED!')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mika' })).toBeInTheDocument()
    expect(screen.getByText('Jollibee')).toBeInTheDocument()
  })

  it('shows spy wins outcome when a civilian was eliminated', () => {
    vi.mocked(useResultsState).mockReturnValue({
      resultsState: {
        ...resultsState,
        eliminatedPlayerName: 'Jam',
        isEliminatedPlayerSpy: false,
        didSpyWin: true,
      },
      isLoading: false,
    })

    renderResultsPage()

    expect(screen.getByText('SPY WINS!')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Jam' })).toBeInTheDocument()
  })

  it('shows real voting history', () => {
    renderResultsPage()

    expect(screen.getByText('Jam')).toBeInTheDocument()
    expect(screen.getAllByText('Mika')).not.toHaveLength(0)
    expect(screen.getByText('Dani')).toBeInTheDocument()
  })

  it('new room button links to create page', () => {
    renderResultsPage()

    const newRoomLinks = screen.getAllByRole('link', { name: /new room/i })
    expect(newRoomLinks.some((link) => link.getAttribute('href') === '/create')).toBe(true)
  })
})

describe('mid-game results (isGameOver=false)', () => {
  const midGameResultsState = {
    ...resultsState,
    isEliminatedPlayerSpy: false,
    didSpyWin: false,
    isGameOver: false,
    hadElimination: true,
    eliminatedPlayerName: 'Jam',
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(useRoomByCode).mockReturnValue({ room, isLoading: false, notFound: false })
    vi.mocked(useResultsState).mockReturnValue({ resultsState: midGameResultsState, isLoading: false })
    vi.mocked(useStartRound).mockReturnValue({ startRound: vi.fn(), isStarting: false, error: null })
    vi.mocked(usePlayAgain).mockReturnValue({ playAgain: vi.fn(), isPlayingAgain: false, error: null })
    vi.mocked(getCurrentPlayerId).mockReturnValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a countdown instead of game-over UI', () => {
    renderResultsPage()
    expect(screen.getByText(/Next round starting in/i)).toBeInTheDocument()
  })

  it('does not show the New Game or Lobby buttons', () => {
    renderResultsPage()
    expect(screen.queryByText('New Game')).not.toBeInTheDocument()
    const lobbyLinks = screen.queryAllByRole('link', { name: 'Lobby' })
    expect(lobbyLinks.some((link) => link.getAttribute('href') === '/room/SPY247')).toBe(false)
  })

  it('calls startRound after countdown when current player is host', async () => {
    const startRound = vi.fn()
    vi.mocked(useStartRound).mockReturnValue({ startRound, isStarting: false, error: null })
    vi.mocked(getCurrentPlayerId).mockReturnValue(hostPlayerId)

    renderResultsPage()

    for (let i = 0; i < 5; i++) {
      await act(async () => { vi.advanceTimersByTime(1000) })
    }

    expect(startRound).toHaveBeenCalledWith({ roomId, hostPlayerId })
  })

  it('does not call startRound when current player is not host', async () => {
    const startRound = vi.fn()
    vi.mocked(useStartRound).mockReturnValue({ startRound, isStarting: false, error: null })
    vi.mocked(getCurrentPlayerId).mockReturnValue('other_player' as Id<'players'>)

    renderResultsPage()

    for (let i = 0; i < 5; i++) {
      await act(async () => { vi.advanceTimersByTime(1000) })
    }

    expect(startRound).not.toHaveBeenCalled()
  })
})

describe('game-over results (isGameOver=true)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(useRoomByCode).mockReturnValue({ room, isLoading: false, notFound: false })
    vi.mocked(useResultsState).mockReturnValue({ resultsState, isLoading: false })
    vi.mocked(useStartRound).mockReturnValue({ startRound: vi.fn(), isStarting: false, error: null })
    vi.mocked(usePlayAgain).mockReturnValue({ playAgain: vi.fn(), isPlayingAgain: false, error: null })
    vi.mocked(getCurrentPlayerId).mockReturnValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows SPY ELIMINATED when spy was caught', () => {
    renderResultsPage()
    expect(screen.getByText('SPY ELIMINATED!')).toBeInTheDocument()
  })

  it('shows New Room button', () => {
    renderResultsPage()
    const newRoomLinks = screen.getAllByRole('link', { name: /new room/i })
    expect(newRoomLinks.some((link) => link.getAttribute('href') === '/create')).toBe(true)
  })

  it('does not show a countdown', () => {
    renderResultsPage()
    expect(screen.queryByText(/Next round starting in/i)).not.toBeInTheDocument()
  })
})

describe('skipped-votes results (isGameOver=false, hadElimination=false)', () => {
  const skippedResultsState = {
    civilianWord: 'Jollibee',
    spyWord: "McDonald's",
    eliminatedPlayerName: null,
    isEliminatedPlayerSpy: false,
    didSpyWin: false,
    isGameOver: false,
    hadElimination: false,
    votingHistory: [
      { voterName: 'Jam', targetName: null },
      { voterName: 'Mika', targetName: null },
      { voterName: 'Dani', targetName: 'Jam' },
    ],
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(useRoomByCode).mockReturnValue({ room, isLoading: false, notFound: false })
    vi.mocked(useResultsState).mockReturnValue({ resultsState: skippedResultsState, isLoading: false })
    vi.mocked(useStartRound).mockReturnValue({ startRound: vi.fn(), isStarting: false, error: null })
    vi.mocked(usePlayAgain).mockReturnValue({ playAgain: vi.fn(), isPlayingAgain: false, error: null })
    vi.mocked(getCurrentPlayerId).mockReturnValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows NO ONE ELIMINATED headline', () => {
    renderResultsPage()
    expect(screen.getByText(/no one eliminated/i)).toBeInTheDocument()
  })

  it('shows THE SPY REMAINS IN THE SHADOWS copy', () => {
    renderResultsPage()
    expect(screen.getByText(/the spy remains in the shadows/i)).toBeInTheDocument()
  })

  it('shows The Verdict Is In badge', () => {
    renderResultsPage()
    expect(screen.getByText(/the verdict is in/i)).toBeInTheDocument()
  })

  it('shows countdown text', () => {
    renderResultsPage()
    expect(screen.getByText(/next round starting in/i)).toBeInTheDocument()
  })

  it('shows Skipped label for null-target votes', () => {
    renderResultsPage()
    const skippedLabels = screen.getAllByText(/skipped/i)
    expect(skippedLabels.length).toBeGreaterThanOrEqual(2)
  })

  it('shows the real vote target name for non-null votes', () => {
    renderResultsPage()
    expect(screen.getAllByText('Jam').length).toBeGreaterThanOrEqual(1)
  })

  it('auto-advances round when host countdown expires', async () => {
    const startRound = vi.fn()
    vi.mocked(useStartRound).mockReturnValue({ startRound, isStarting: false, error: null })
    vi.mocked(getCurrentPlayerId).mockReturnValue(hostPlayerId)

    renderResultsPage()

    for (let i = 0; i < 5; i++) {
      await act(async () => { vi.advanceTimersByTime(1000) })
    }

    expect(startRound).toHaveBeenCalledWith({ roomId, hostPlayerId })
  })
})
