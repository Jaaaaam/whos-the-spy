import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { GAME_STATUS } from '../../../../shared/gameStatus'
import { usePlayersByRoom } from '../../room/hooks/usePlayersByRoom'
import { useRoomByCode } from '../../room/hooks/useRoomByCode'
import { clearCurrentPlayerId, saveCurrentPlayerId } from '../../room/lib/currentPlayer'
import { useCastVote } from '../hooks/actions/useCastVote'
import { useFinalizeVoting } from '../hooks/actions/useFinalizeVoting'
import { useAdvanceVotingIfExpired } from '../hooks/advance/useAdvanceVotingIfExpired'
import { useSkipVote } from '../hooks/actions/useSkipVote'
import { useVoteProgress } from '../hooks/state/useVoteProgress'
import { VotingPage } from './VotingPage'

vi.mock('../../room/hooks/useRoomByCode')
vi.mock('../../room/hooks/useHeartbeat')
vi.mock('../../room/hooks/usePlayersByRoom')
vi.mock('../hooks/state/useVoteProgress')
vi.mock('../hooks/actions/useCastVote')
vi.mock('../hooks/actions/useFinalizeVoting')
vi.mock('../hooks/advance/useAdvanceVotingIfExpired')
vi.mock('../hooks/actions/useSkipVote')

const roomId = 'room_1' as Id<'rooms'>
const roundId = 'round_1' as Id<'rounds'>
const playerId = 'player_1' as Id<'players'>
const secondPlayerId = 'player_2' as Id<'players'>
const disconnectedPlayerId = 'player_3' as Id<'players'>

const room: Doc<'rooms'> = {
  _id: roomId,
  _creationTime: 0,
  code: 'SPY247',
  status: GAME_STATUS.VOTING,
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
    lastSeenAt: 0,
  },
  {
    _id: secondPlayerId,
    _creationTime: 0,
    roomId,
    name: 'Mika',
    isHost: false,
    isConnected: true,
    joinedAt: 0,
    lastSeenAt: 0,
  },
  {
    _id: disconnectedPlayerId,
    _creationTime: 0,
    roomId,
    name: 'Dani',
    isHost: false,
    isConnected: false,
    joinedAt: 0,
    lastSeenAt: 0,
  },
]

function renderVotingPage() {
  return render(
    <MemoryRouter initialEntries={['/room/SPY247/voting']}>
      <Routes>
        <Route path="/room/:roomCode/voting" element={<VotingPage />} />
        <Route path="/room/:roomCode/role" element={<div>Role redirect</div>} />
        <Route path="/room/:roomCode/discussion" element={<div>Discussion redirect</div>} />
        <Route path="/room/:roomCode/results" element={<div>Results redirect</div>} />
        <Route path="/room/:roomCode/battle" element={<div>Battle redirect</div>} />
        <Route path="/room/:roomCode" element={<div>Lobby redirect</div>} />
        <Route path="/join" element={<div>Join redirect</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('VotingPage', () => {
  beforeEach(() => {
    localStorage.clear()
    saveCurrentPlayerId(playerId)
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
    vi.mocked(useVoteProgress).mockReturnValue({
      voteProgress: {
        votedCount: 1,
        eligibleVoterCount: 2,
        isComplete: false,
        selectedTargetPlayerId: null,
        votingEndsAt: null,
        hasVoted: false,
        tieCandidateIds: null,
      },
      isLoading: false,
      notFound: false,
    })
    vi.mocked(useCastVote).mockReturnValue({
      castVote: vi.fn(),
      isCastingVote: false,
      error: null,
    })
    vi.mocked(useFinalizeVoting).mockReturnValue({
      finalizeVoting: vi.fn(),
      isFinalizingVote: false,
      error: null,
    })
    vi.mocked(useAdvanceVotingIfExpired).mockReturnValue({
      advanceVotingIfExpired: vi.fn(),
      isAdvancing: false,
      error: null,
    })
    vi.mocked(useSkipVote).mockReturnValue({
      skipVote: vi.fn(),
      isSkipping: false,
      error: null,
    })
  })

  it('shows a loading state while the room is loading', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: undefined,
      isLoading: true,
      notFound: false,
    })

    renderVotingPage()

    expect(screen.getByText('Loading room')).toBeInTheDocument()
  })

  it('redirects to join when the room is not found', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: null,
      isLoading: false,
      notFound: true,
    })

    renderVotingPage()

    expect(screen.getByText('Join redirect')).toBeInTheDocument()
  })

  it('redirects to join when there is no current player', () => {
    clearCurrentPlayerId()

    renderVotingPage()

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

    renderVotingPage()

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

    renderVotingPage()

    expect(screen.getByText('Role redirect')).toBeInTheDocument()
  })

  it('redirects to discussion when the room phase changes back', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: {
        ...room,
        status: GAME_STATUS.DISCUSSION,
      },
      isLoading: false,
      notFound: false,
    })

    renderVotingPage()

    expect(screen.getByText('Discussion redirect')).toBeInTheDocument()
  })

  it('shows a loading state while voting data is loading', () => {
    vi.mocked(useVoteProgress).mockReturnValue({
      voteProgress: undefined,
      isLoading: true,
      notFound: false,
    })

    renderVotingPage()

    expect(screen.getByText('Loading voting')).toBeInTheDocument()
  })

  it('renders connected players and vote progress', () => {
    renderVotingPage()

    expect(screen.getByRole('heading', { name: 'Time to Decide' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Jam' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mika' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Dani' })).not.toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vote' })).toBeEnabled()
  })

  it('marks the current player selected vote', () => {
    vi.mocked(useVoteProgress).mockReturnValue({
      voteProgress: {
        votedCount: 1,
        eligibleVoterCount: 2,
        isComplete: false,
        selectedTargetPlayerId: secondPlayerId,
        votingEndsAt: null,
        hasVoted: false,
        tieCandidateIds: null,
      },
      isLoading: false,
      notFound: false,
    })

    renderVotingPage()

    expect(screen.getAllByText('Voted')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Vote' })).toBeEnabled()
  })

  it('casts a vote for a valid target', () => {
    const castVote = vi.fn()
    vi.mocked(useCastVote).mockReturnValue({
      castVote,
      isCastingVote: false,
      error: null,
    })

    renderVotingPage()
    fireEvent.click(screen.getByRole('button', { name: 'Vote' }))

    expect(castVote).toHaveBeenCalledWith({
      roomId,
      roundId,
      voterPlayerId: playerId,
      targetPlayerId: secondPlayerId,
    })
  })

  it('disables vote buttons while a vote is being submitted', () => {
    vi.mocked(useCastVote).mockReturnValue({
      castVote: vi.fn(),
      isCastingVote: true,
      error: null,
    })

    renderVotingPage()

    expect(screen.getByRole('button', { name: 'Vote' })).toBeDisabled()
  })

  it('shows vote mutation errors', () => {
    vi.mocked(useCastVote).mockReturnValue({
      castVote: vi.fn(),
      isCastingVote: false,
      error: 'Unable to cast vote.',
    })

    renderVotingPage()

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to cast vote.')
  })

  it('does not show eliminated players as voting targets', () => {
    vi.mocked(usePlayersByRoom).mockReturnValue({
      players: [
        ...players,
        {
          _id: 'player_4' as Id<'players'>,
          _creationTime: 0,
          roomId,
          name: 'Eli',
          isHost: false,
          isConnected: true,
          joinedAt: 0,
          lastSeenAt: 0,
          isEliminated: true,
        },
      ],
      isLoading: false,
      isEmpty: false,
    })

    renderVotingPage()

    expect(screen.queryByRole('heading', { name: 'Eli' })).not.toBeInTheDocument()
  })

  it('shows a spectating indicator and hides vote count when the current player is eliminated', () => {
    saveCurrentPlayerId('player_4' as Id<'players'>)
    vi.mocked(usePlayersByRoom).mockReturnValue({
      players: [
        ...players,
        {
          _id: 'player_4' as Id<'players'>,
          _creationTime: 0,
          roomId,
          name: 'Eli',
          isHost: false,
          isConnected: true,
          joinedAt: 0,
          lastSeenAt: 0,
          isEliminated: true,
        },
      ],
      isLoading: false,
      isEmpty: false,
    })

    renderVotingPage()

    expect(screen.getByText('Spectating')).toBeInTheDocument()
    expect(screen.queryByText(/players have voted/)).not.toBeInTheDocument()
  })

  it('shows an empty state when no active players can vote', () => {
    vi.mocked(usePlayersByRoom).mockReturnValue({
      players: [],
      isLoading: false,
      isEmpty: true,
    })

    renderVotingPage()

    expect(screen.getByText('No active players are available to vote for.')).toBeInTheDocument()
  })

  it('calls finalizeVoting once when voting is complete', () => {
    const finalizeVoting = vi.fn()
    vi.mocked(useFinalizeVoting).mockReturnValue({
      finalizeVoting,
      isFinalizingVote: false,
      error: null,
    })
    vi.mocked(useVoteProgress).mockReturnValue({
      voteProgress: {
        votedCount: 2,
        eligibleVoterCount: 2,
        isComplete: true,
        selectedTargetPlayerId: secondPlayerId,
        votingEndsAt: null,
        hasVoted: true,
        tieCandidateIds: null,
      },
      isLoading: false,
      notFound: false,
    })

    renderVotingPage()

    expect(finalizeVoting).toHaveBeenCalledOnce()
    expect(finalizeVoting).toHaveBeenCalledWith({
      roomId,
      roundId,
    })
  })

  it('does not call finalizeVoting when voting is incomplete', () => {
    const finalizeVoting = vi.fn()
    vi.mocked(useFinalizeVoting).mockReturnValue({
      finalizeVoting,
      isFinalizingVote: false,
      error: null,
    })
    vi.mocked(useVoteProgress).mockReturnValue({
      voteProgress: {
        votedCount: 1,
        eligibleVoterCount: 2,
        isComplete: false,
        selectedTargetPlayerId: null,
        votingEndsAt: null,
        hasVoted: false,
        tieCandidateIds: null,
      },
      isLoading: false,
      notFound: false,
    })

    renderVotingPage()

    expect(finalizeVoting).not.toHaveBeenCalled()
  })

  it('redirects to results when room status becomes RESULTS', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: {
        ...room,
        status: GAME_STATUS.RESULTS,
      },
      isLoading: false,
      notFound: false,
    })

    renderVotingPage()

    expect(screen.getByText('Results redirect')).toBeInTheDocument()
  })

  it('redirects to battle when room status becomes BATTLE', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: { ...room, status: GAME_STATUS.BATTLE },
      isLoading: false,
      notFound: false,
    })

    renderVotingPage()

    expect(screen.getByText('Battle redirect')).toBeInTheDocument()
  })

  it('redirects to lobby when room status becomes LOBBY', () => {
    vi.mocked(useRoomByCode).mockReturnValue({
      room: {
        ...room,
        status: GAME_STATUS.LOBBY,
      },
      isLoading: false,
      notFound: false,
    })

    renderVotingPage()

    expect(screen.getByText('Lobby redirect')).toBeInTheDocument()
  })

  it('shows finalization error message', () => {
    vi.mocked(useFinalizeVoting).mockReturnValue({
      finalizeVoting: vi.fn(),
      isFinalizingVote: false,
      error: 'Unable to finalize voting.',
    })

    renderVotingPage()

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to finalize voting.')
  })

  it('shows retry button on finalization error', () => {
    const finalizeVoting = vi.fn()
    vi.mocked(useFinalizeVoting).mockReturnValue({
      finalizeVoting,
      isFinalizingVote: false,
      error: 'Unable to finalize voting.',
    })

    renderVotingPage()

    const retryButton = screen.getByRole('button', { name: 'Retry' })
    expect(retryButton).toBeInTheDocument()

    fireEvent.click(retryButton)

    expect(finalizeVoting).toHaveBeenCalledWith({
      roomId,
      roundId,
    })
  })

  describe('runoff voter view', () => {
    const fourthPlayerId = 'player_4' as Id<'players'>

    beforeEach(() => {
      vi.mocked(usePlayersByRoom).mockReturnValue({
        players: [
          ...players.filter(p => p.isConnected),
          {
            _id: fourthPlayerId,
            _creationTime: 0,
            roomId,
            name: 'Alex',
            isHost: false,
            isConnected: true,
            joinedAt: 0,
            lastSeenAt: 0,
          },
        ],
        isLoading: false,
        isEmpty: false,
      })
      vi.mocked(useVoteProgress).mockReturnValue({
        voteProgress: {
          votedCount: 0,
          eligibleVoterCount: 1,
          isComplete: false,
          selectedTargetPlayerId: null,
          votingEndsAt: null,
          hasVoted: false,
          tieCandidateIds: [secondPlayerId, fourthPlayerId],
        },
        isLoading: false,
        notFound: false,
      })
    })

    it('shows the tiebreaker heading when tieCandidateIds is set and current player is not a candidate', () => {
      renderVotingPage()
      expect(screen.getByRole('heading', { name: 'Break the Tie' })).toBeInTheDocument()
    })

    it('only renders tied candidates as vote targets', () => {
      renderVotingPage()
      expect(screen.getByRole('heading', { name: 'Mika' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Alex' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Jam' })).not.toBeInTheDocument()
    })

    it('shows the Tiebreaker Round chip', () => {
      renderVotingPage()
      expect(screen.getByText('Tiebreaker Round')).toBeInTheDocument()
    })
  })

  describe('runoff candidate view', () => {
    beforeEach(() => {
      vi.mocked(useVoteProgress).mockReturnValue({
        voteProgress: {
          votedCount: 0,
          eligibleVoterCount: 1,
          isComplete: false,
          selectedTargetPlayerId: null,
          votingEndsAt: null,
          hasVoted: false,
          tieCandidateIds: [playerId, secondPlayerId],
        },
        isLoading: false,
        notFound: false,
      })
    })

    it('shows the on trial heading when the current player is a tied candidate', () => {
      renderVotingPage()
      expect(screen.getByRole('heading', { name: "You're on Trial" })).toBeInTheDocument()
    })

    it('does not show a Vote button', () => {
      renderVotingPage()
      expect(screen.queryByRole('button', { name: 'Vote' })).not.toBeInTheDocument()
    })

    it('does not show a Skip Vote button', () => {
      renderVotingPage()
      expect(screen.queryByRole('button', { name: 'Skip Vote' })).not.toBeInTheDocument()
    })
  })
})
