import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { saveCurrentPlayerId } from '../../room/lib/currentPlayer'
import { useCastCategoryVote } from '../hooks/actions/useCastCategoryVote'
import { useAdvanceCategoryVotingIfExpired } from '../hooks/advance/useAdvanceCategoryVotingIfExpired'
import { useCategoryVotingState } from '../hooks/state/useCategoryVotingState'
import { CategoryVotingPage } from './CategoryVotingPage'

vi.mock('../../room/hooks/useRoomByCode')
vi.mock('../../room/hooks/useHeartbeat')
vi.mock('../hooks/state/useCategoryVotingState')
vi.mock('../hooks/actions/useCastCategoryVote')
vi.mock('../hooks/advance/useAdvanceCategoryVotingIfExpired')

const roomId = 'room_1' as Id<'rooms'>
const roundId = 'round_1' as Id<'rounds'>
const playerId = 'player_1' as Id<'players'>

const room: Doc<'rooms'> = {
  _id: roomId,
  _creationTime: 0,
  code: 'SPY247',
  status: GAME_STATUS.CATEGORY_VOTING,
  mode: 'wordless_spy',
  currentRoundId: roundId,
  createdAt: 0,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/room/SPY247/category-voting']}>
      <Routes>
        <Route path="/room/:roomCode/category-voting" element={<CategoryVotingPage />} />
        <Route path="/room/:roomCode/word-submission" element={<div>Word submission redirect</div>} />
        <Route path="/room/:roomCode" element={<div>Lobby redirect</div>} />
        <Route path="/join" element={<div>Join redirect</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CategoryVotingPage', () => {
  beforeEach(() => {
    localStorage.clear()
    saveCurrentPlayerId(playerId)
    vi.mocked(useRoomByCode).mockReturnValue({ room, isLoading: false, notFound: false })
    vi.mocked(useCategoryVotingState).mockReturnValue({
      votingState: {
        categoryVoteEndsAt: Date.now() + 45_000,
        suggestions: [
          { suggestionId: 'cs_1' as Id<'categorySuggestions'>, text: 'Animals', isMine: true },
          { suggestionId: 'cs_2' as Id<'categorySuggestions'>, text: 'Movies', isMine: false },
        ],
        votedCount: 0,
        activePlayerCount: 3,
        myVoteSuggestionId: null,
      },
      isLoading: false,
      notFound: false,
    })
    vi.mocked(useCastCategoryVote).mockReturnValue({
      castCategoryVote: vi.fn(),
      isCastingVote: false,
      error: null,
    })
    vi.mocked(useAdvanceCategoryVotingIfExpired).mockReturnValue({
      advanceCategoryVotingIfExpired: vi.fn(),
      isAdvancing: false,
      error: null,
    })
  })

  it('casts a vote for a tapped category', async () => {
    const castCategoryVote = vi.fn().mockResolvedValue({ voteId: 'cv_1', isUpdated: false })
    vi.mocked(useCastCategoryVote).mockReturnValue({ castCategoryVote, isCastingVote: false, error: null })

    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Movies/ }))

    await waitFor(() => {
      expect(castCategoryVote).toHaveBeenCalledWith({
        roomId,
        roundId,
        voterPlayerId: playerId,
        suggestionId: 'cs_2',
      })
    })
  })

  it('disables the player’s own suggestion', () => {
    renderPage()

    expect(screen.getByRole('button', { name: /Animals/ })).toBeDisabled()
    expect(screen.getByText(/Yours/i)).toBeInTheDocument()
  })

  it('redirects when the room moves to word submission', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: { ...room, status: GAME_STATUS.WORD_SUBMISSION },
      isLoading: false,
      notFound: false,
    })

    renderPage()

    expect(screen.getByText('Word submission redirect')).toBeInTheDocument()
  })
})
