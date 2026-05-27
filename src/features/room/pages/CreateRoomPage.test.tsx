import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { MAX_PLAYERS_PER_ROOM } from '../../../../shared/gameSettings'
import { useCreateRoom } from '../hooks/useCreateRoom'
import { CreateRoomPage } from './CreateRoomPage'

vi.mock('../hooks/useCreateRoom')

function renderCreateRoomPage() {
  vi.mocked(useCreateRoom).mockReturnValue({
    createRoom: vi.fn(),
    isCreating: false,
    error: null,
  })

  return render(
    <MemoryRouter>
      <CreateRoomPage />
    </MemoryRouter>,
  )
}

describe('CreateRoomPage', () => {
  it('renders the host configuration controls', () => {
    renderCreateRoomPage()

    expect(screen.getByRole('heading', { name: 'Room Configuration' })).toBeInTheDocument()
    expect(screen.getByLabelText('Your Name')).toHaveValue('Jam')
    expect(screen.getByLabelText('Expected Players')).toHaveValue(8)
    expect(
      screen.getByText((text) => text.includes(`Room capacity is ${MAX_PLAYERS_PER_ROOM}.`)),
    ).toBeInTheDocument()
  })

  it('updates spy count, timer, and rule toggles', () => {
    renderCreateRoomPage()

    fireEvent.click(screen.getByLabelText('Increase spy count'))
    expect(screen.getByText('3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '10m' }))
    expect(screen.getByRole('button', { name: '10m' })).toHaveClass('bg-primary-container')

    const anonymousVoting = screen.getByRole('switch', { name: 'Anonymous Voting' })
    expect(anonymousVoting).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(anonymousVoting)
    expect(anonymousVoting).toHaveAttribute('aria-checked', 'true')
  })
})
