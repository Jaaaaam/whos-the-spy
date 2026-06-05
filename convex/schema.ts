import { defineSchema } from 'convex/server'
import { players } from './schema/players'
import { roleAssignments } from './schema/roleAssignments'
import { rooms } from './schema/rooms'
import { rounds } from './schema/rounds'
import { votes } from './schema/votes'

export default defineSchema({
  rooms,
  players,
  rounds,
  roleAssignments,
  votes
})
