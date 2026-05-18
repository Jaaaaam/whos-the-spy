import type { Id } from '../../../../convex/_generated/dataModel'

const currentPlayerKey = 'whos-the-spy.currentPlayerId'

export function saveCurrentPlayerId(playerId: Id<'players'>) {
  sessionStorage.setItem(currentPlayerKey, playerId)
}

export function getCurrentPlayerId() {
  return sessionStorage.getItem(currentPlayerKey) as Id<'players'> | null
}

export function clearCurrentPlayerId() {
  sessionStorage.removeItem(currentPlayerKey)
}
