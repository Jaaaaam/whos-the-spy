import type { Id } from "../_generated/dataModel"
import { TABLE } from "../lib/db"

export type StartRoundArgs = {
  roomId: Id<typeof TABLE.ROOMS>
  hostPlayerId: Id<typeof TABLE.PLAYERS>
  spyCount?: number
}

export type RoomRoundArgs = {
  roomId: Id<typeof TABLE.ROOMS>
  roundId: Id<typeof TABLE.ROUNDS>
}

export type GetRoundArgs = {
  roundId: Id<typeof TABLE.ROUNDS>
}

export type RoundPlayerArgs = {
  roundId: Id<typeof TABLE.ROUNDS>
  playerId: Id<typeof TABLE.PLAYERS>
}

export type EndDiscussionTurnArgs = RoomRoundArgs & {
  playerId: Id<typeof TABLE.PLAYERS>
}

export type AdvanceDiscussionTurnArgs = RoomRoundArgs & {
  discussionOrder: Id<typeof TABLE.PLAYERS>[]
  currentTurnIndex: number
  durationMs: number
  votingDurationMs: number
}

export type CastVoteArgs = RoomRoundArgs & {
  voterPlayerId: Id<typeof TABLE.PLAYERS>
  targetPlayerId: Id<typeof TABLE.PLAYERS>
}

export type VoteProgressArgs = RoomRoundArgs & {
  voterPlayerId?: Id<typeof TABLE.PLAYERS>
}

export type SkipVoteArgs = RoomRoundArgs & {
  voterPlayerId: Id<typeof TABLE.PLAYERS>
}

export type SubmitCategorySuggestionArgs = RoomRoundArgs & {
  playerId: Id<typeof TABLE.PLAYERS>
  text: string
}

export type PhaseStateArgs = RoomRoundArgs & {
  playerId?: Id<typeof TABLE.PLAYERS>
}

export type CastCategoryVoteArgs = RoomRoundArgs & {
  voterPlayerId: Id<typeof TABLE.PLAYERS>
  suggestionId: Id<typeof TABLE.CATEGORY_SUGGESTIONS>
}

export type SubmitWordArgs = RoomRoundArgs & {
  playerId: Id<typeof TABLE.PLAYERS>
  word: string
}