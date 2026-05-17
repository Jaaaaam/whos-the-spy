export type Player = {
  id: string
  name: string
  isHost?: boolean
  status: 'ready' | 'waiting' | 'speaking' | 'voted'
  avatar: string
}

export const mockRoom = {
  code: 'SPY247',
  category: 'Food',
  timer: '03:00',
  round: 1,
}

export const mockPlayers: Player[] = [
  { id: 'jam', name: 'Jam', isHost: true, status: 'ready', avatar: 'JA' },
  { id: 'alex', name: 'Alex', status: 'speaking', avatar: 'AX' },
  { id: 'mika', name: 'Mika', status: 'waiting', avatar: 'MK' },
  { id: 'dani', name: 'Dani', status: 'ready', avatar: 'DN' },
  { id: 'carlo', name: 'Carlo', status: 'waiting', avatar: 'CR' },
]
