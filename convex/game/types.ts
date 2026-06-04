import type { Id } from "../_generated/dataModel"

export type StartRoundArgs = {
  roomId: Id<'rooms'>
  hostPlayerId: Id<'players'>
  spyCount?: number
}

export type RoomRoundArgs = {
  roomId: Id<'rooms'>
  roundId: Id<'rounds'>
}

export type GetRoundArgs = {
  roundId: Id<'rounds'>
}

export type RoundPlayerArgs = {
  roundId: Id<'rounds'>
  playerId: Id<'players'>
}

export type EndDiscussionTurnArgs = RoomRoundArgs & {
  playerId: Id<'players'>
}

export type AdvanceDiscussionTurnArgs = RoomRoundArgs & {
  discussionOrder: Id<'players'>[]
  currentTurnIndex: number
}
