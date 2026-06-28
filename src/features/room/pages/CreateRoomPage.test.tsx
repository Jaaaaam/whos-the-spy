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
    expect(screen.getByPlaceholderText('YOUR CODENAME...')).toHaveValue('')
    expect(
      screen.getByText((text) => text.includes(`Room capacity is ${MAX_PLAYERS_PER_ROOM}.`)),
    ).toBeInTheDocument()
  })

  it('selects a discussion turn timer', () => {
    renderCreateRoomPage()

    const twoMin = screen.getByRole('button', { name: '2 min' })
    fireEvent.click(twoMin)
    expect(twoMin).toHaveClass('bg-primary-container')

    const oneMin = screen.getByRole('button', { name: '1 min' })
    expect(oneMin).not.toHaveClass('bg-primary-container')
  })
})
