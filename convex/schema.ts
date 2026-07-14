import { defineSchema } from 'convex/server'
import { categorySuggestions } from './schema/categorySuggestions'
import { categoryVotes } from './schema/categoryVotes'
import { players } from './schema/players'
import { roleAssignments } from './schema/roleAssignments'
import { rooms } from './schema/rooms'
import { rounds } from './schema/rounds'
import { votes } from './schema/votes'
import { wordSubmissions } from './schema/wordSubmissions'

export default defineSchema({
  rooms,
  players,
  rounds,
  roleAssignments,
  votes,
  categorySuggestions,
  categoryVotes,
  wordSubmissions,
})
