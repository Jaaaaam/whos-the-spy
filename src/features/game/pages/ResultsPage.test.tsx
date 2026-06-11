import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { useResultsState } from '../hooks/useResultsState'
import { ResultsPage } from './ResultsPage'

vi.mock('../../room/hooks/useRoomByCode')
vi.mock('../hooks/useResultsState')

const roomId = 'room_1' as Id<'rooms'>
const roundId = 'round_1' as Id<'rounds'>

const room: Doc<'rooms'> = {
  _id: roomId,
  _creationTime: 0,
  code: 'SPY247',
  status: GAME_STATUS.RESULTS,
  currentRoundId: roundId,
  createdAt: 0,
}

const resultsState = {
  civilianWord: 'Jollibee',
  eliminatedPlayerName: 'Mika',
  isEliminatedPlayerSpy: true,
  didSpyWin: false,
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
    vi.mocked(useRoomByCode).mockReturnValue({
      room,
      isLoading: false,
      notFound: false,
    })
    vi.mocked(useResultsState).mockReturnValue({
      resultsState,
      isLoading: false,
    })
  })

  it('shows loading state while room is loading', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: undefined,
      isLoading: true,
      notFound: false,
    })

    renderResultsPage()

    expect(screen.getByText('Loading results...')).toBeInTheDocument()
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

    expect(screen.getByText('Loading results...')).toBeInTheDocument()
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

  it('lobby button links to actual room', () => {
    renderResultsPage()

    const lobbyLinks = screen.getAllByRole('link', { name: /lobby/i })
    expect(lobbyLinks.some((link) => link.getAttribute('href') === '/room/SPY247')).toBe(true)
  })
})
