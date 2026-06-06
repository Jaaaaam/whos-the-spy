import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Player } from '../data/mockRoom'
import { PlayerList } from './PlayerList'

const players: Player[] = [
  { id: 'host', name: 'Jam', isHost: true, status: 'ready', avatar: 'JA' },
  { id: 'guest', name: 'Alex', status: 'waiting', avatar: 'AX' },
]

describe('PlayerList', () => {
  it('renders the active player count and players', () => {
    render(<PlayerList players={players} />)

    expect(screen.getByText('2 Active')).toBeInTheDocument()
    expect(screen.getByText('Jam')).toBeInTheDocument()
    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.getByText('Host')).toBeInTheDocument()
  })

  it('renders an empty state when no players have joined', () => {
    render(<PlayerList players={[]} isEmpty />)

    expect(screen.getByText('0 Active')).toBeInTheDocument()
    expect(screen.getByText('No players have joined yet.')).toBeInTheDocument()
  })

  it('groups disconnected players separately from active players', () => {
    render(
      <PlayerList
        players={[
          ...players,
          { id: 'disconnected', name: 'Mika', status: 'disconnected', avatar: 'MK' },
        ]}
      />,
    )

    expect(screen.getByText('2 Active')).toBeInTheDocument()
    expect(screen.getAllByText('Disconnected')).toHaveLength(2)
    expect(screen.getByText('Mika')).toBeInTheDocument()
  })
})
