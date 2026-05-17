import { mockPlayers } from '../../room/data/mockRoom'

export const mockGame = {
  secretWord: 'Jollibee',
  spy: 'Mika',
  timer: '03:00',
  discussionTimer: '02:14',
  votingTimer: '00:44',
  category: 'Food',
  activePlayer: 'Alex',
  players: mockPlayers,
  votes: [
    { voter: 'Jam', target: 'Mika' },
    { voter: 'Alex', target: 'Carlo' },
    { voter: 'Dani', target: 'Mika' },
    { voter: 'Carlo', target: 'Mika' },
    { voter: 'Mika', target: 'Dani' },
  ],
}
