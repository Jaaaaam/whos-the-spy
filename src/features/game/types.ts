import type { Id } from '../../../convex/_generated/dataModel'

export type RoundIdArgs = {
  roundId: Id<'rounds'> | undefined
}

export type RoomRoundIdArgs = RoundIdArgs & {
  roomId: Id<'rooms'> | undefined
}

export type RoundPlayerIdArgs = RoundIdArgs & {
  playerId: Id<'players'> | null
}

export type VoteProgressIdArgs = RoomRoundIdArgs & {
  voterPlayerId: Id<'players'> | null
}

export type RoomHostArgs = {
  roomId: Id<'rooms'>
  hostPlayerId: Id<'players'>
}
