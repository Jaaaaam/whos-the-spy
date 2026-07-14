import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { saveCurrentPlayerId } from '../../room/lib/currentPlayer'
import { useSubmitWord } from '../hooks/actions/useSubmitWord'
import { useAdvanceWordSubmissionIfExpired } from '../hooks/advance/useAdvanceWordSubmissionIfExpired'
import { useWordSubmissionState } from '../hooks/state/useWordSubmissionState'
import { WordSubmissionPage } from './WordSubmissionPage'

vi.mock('../../room/hooks/useRoomByCode')
vi.mock('../../room/hooks/useHeartbeat')
vi.mock('../hooks/state/useWordSubmissionState')
vi.mock('../hooks/actions/useSubmitWord')
vi.mock('../hooks/advance/useAdvanceWordSubmissionIfExpired')

const roomId = 'room_1' as Id<'rooms'>
const roundId = 'round_1' as Id<'rounds'>
const playerId = 'player_1' as Id<'players'>

const room: Doc<'rooms'> = {
  _id: roomId,
  _creationTime: 0,
  code: 'SPY247',
  status: GAME_STATUS.WORD_SUBMISSION,
  mode: 'wordless_spy',
  currentRoundId: roundId,
  createdAt: 0,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/room/SPY247/word-submission']}>
      <Routes>
        <Route path="/room/:roomCode/word-submission" element={<WordSubmissionPage />} />
        <Route path="/room/:roomCode/role" element={<div>Role reveal redirect</div>} />
        <Route path="/room/:roomCode" element={<div>Lobby redirect</div>} />
        <Route path="/join" element={<div>Join redirect</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('WordSubmissionPage', () => {
  beforeEach(() => {
    localStorage.clear()
    saveCurrentPlayerId(playerId)
    vi.mocked(useRoomByCode).mockReturnValue({ room, isLoading: false, notFound: false })
    vi.mocked(useWordSubmissionState).mockReturnValue({
      submissionState: {
        wordSubmissionEndsAt: Date.now() + 45_000,
        category: 'Animals',
        submittedCount: 1,
        activePlayerCount: 3,
        hasSubmitted: false,
      },
      isLoading: false,
      notFound: false,
    })
    vi.mocked(useSubmitWord).mockReturnValue({
      submitWord: vi.fn(),
      isSubmitting: false,
      error: null,
    })
    vi.mocked(useAdvanceWordSubmissionIfExpired).mockReturnValue({
      advanceWordSubmissionIfExpired: vi.fn(),
      isAdvancing: false,
      error: null,
    })
  })

  it('shows the winning category prominently', () => {
    renderPage()

    expect(screen.getByText('Animals')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Submit a Word' })).toBeInTheDocument()
  })

  it('submits the typed word', async () => {
    const submitWord = vi.fn().mockResolvedValue({ submissionId: 'ws_1', isUpdated: false })
    vi.mocked(useSubmitWord).mockReturnValue({ submitWord, isSubmitting: false, error: null })

    renderPage()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Lion' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit Word' }))

    await waitFor(() => {
      expect(submitWord).toHaveBeenCalledWith({ roomId, roundId, playerId, word: 'Lion' })
    })
  })

  it('shows a waiting state after submitting', () => {
    vi.mocked(useWordSubmissionState).mockReturnValue({
      submissionState: {
        wordSubmissionEndsAt: Date.now() + 45_000,
        category: 'Animals',
        submittedCount: 2,
        activePlayerCount: 3,
        hasSubmitted: true,
      },
      isLoading: false,
      notFound: false,
    })

    renderPage()

    expect(screen.getByText('2/3')).toBeInTheDocument()
    expect(screen.getByText(/Waiting for the other agents/i)).toBeInTheDocument()
  })

  it('redirects when the room moves to role reveal', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: { ...room, status: GAME_STATUS.ROLE_REVEAL },
      isLoading: false,
      notFound: false,
    })

    renderPage()

    expect(screen.getByText('Role reveal redirect')).toBeInTheDocument()
  })
})
