import { cronJobs } from "convex/server";
import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval(
  'mark-disconnected-players',
  { seconds: 20 },
  internal.players.markDisconnectedPlayers
)

export default crons