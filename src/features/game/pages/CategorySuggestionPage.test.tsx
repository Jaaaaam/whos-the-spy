import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { saveCurrentPlayerId } from '../../room/lib/currentPlayer'
import { useSubmitCategorySuggestion } from '../hooks/actions/useSubmitCategorySuggestion'
import { useAdvanceCategorySuggestionIfExpired } from '../hooks/advance/useAdvanceCategorySuggestionIfExpired'
import { useCategorySuggestionState } from '../hooks/state/useCategorySuggestionState'
import { CategorySuggestionPage } from './CategorySuggestionPage'

vi.mock('../../room/hooks/useRoomByCode')
vi.mock('../../room/hooks/useHeartbeat')
vi.mock('../hooks/state/useCategorySuggestionState')
vi.mock('../hooks/actions/useSubmitCategorySuggestion')
vi.mock('../hooks/advance/useAdvanceCategorySuggestionIfExpired')

const roomId = 'room_1' as Id<'rooms'>
const roundId = 'round_1' as Id<'rounds'>
const playerId = 'player_1' as Id<'players'>

const room: Doc<'rooms'> = {
  _id: roomId,
  _creationTime: 0,
  code: 'SPY247',
  status: GAME_STATUS.CATEGORY_SUGGESTION,
  mode: 'wordless_spy',
  currentRoundId: roundId,
  createdAt: 0,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/room/SPY247/category-suggestion']}>
      <Routes>
        <Route path="/room/:roomCode/category-suggestion" element={<CategorySuggestionPage />} />
        <Route path="/room/:roomCode/category-voting" element={<div>Category voting redirect</div>} />
        <Route path="/room/:roomCode" element={<div>Lobby redirect</div>} />
        <Route path="/join" element={<div>Join redirect</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CategorySuggestionPage', () => {
  beforeEach(() => {
    localStorage.clear()
    saveCurrentPlayerId(playerId)
    vi.mocked(useRoomByCode).mockReturnValue({ room, isLoading: false, notFound: false })
    vi.mocked(useCategorySuggestionState).mockReturnValue({
      suggestionState: {
        suggestionEndsAt: Date.now() + 45_000,
        suggestedCount: 1,
        activePlayerCount: 3,
        hasSuggested: false,
      },
      isLoading: false,
      notFound: false,
    })
    vi.mocked(useSubmitCategorySuggestion).mockReturnValue({
      submitCategorySuggestion: vi.fn(),
      isSubmitting: false,
      error: null,
    })
    vi.mocked(useAdvanceCategorySuggestionIfExpired).mockReturnValue({
      advanceCategorySuggestionIfExpired: vi.fn(),
      isAdvancing: false,
      error: null,
    })
  })

  it('submits the typed category', async () => {
    const submitCategorySuggestion = vi.fn().mockResolvedValue({ suggestionId: 'cs_1', isUpdated: false })
    vi.mocked(useSubmitCategorySuggestion).mockReturnValue({
      submitCategorySuggestion,
      isSubmitting: false,
      error: null,
    })

    renderPage()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Animals' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit Category' }))

    await waitFor(() => {
      expect(submitCategorySuggestion).toHaveBeenCalledWith({
        roomId,
        roundId,
        playerId,
        text: 'Animals',
      })
    })
  })

  it('shows a waiting state after suggesting', () => {
    vi.mocked(useCategorySuggestionState).mockReturnValue({
      suggestionState: {
        suggestionEndsAt: Date.now() + 45_000,
        suggestedCount: 2,
        activePlayerCount: 3,
        hasSuggested: true,
      },
      isLoading: false,
      notFound: false,
    })

    renderPage()

    expect(screen.getByText('2/3')).toBeInTheDocument()
    expect(screen.getByText(/Waiting for the other agents/i)).toBeInTheDocument()
  })

  it('redirects when the room moves to category voting', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: { ...room, status: GAME_STATUS.CATEGORY_VOTING },
      isLoading: false,
      notFound: false,
    })

    renderPage()

    expect(screen.getByText('Category voting redirect')).toBeInTheDocument()
  })
})
