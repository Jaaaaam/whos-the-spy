import type { Id } from '../../../../convex/_generated/dataModel'

const currentPlayerKey = 'whos-the-spy.currentPlayerId'

export function saveCurrentPlayerId(playerId: Id<'players'>) {
  localStorage.setItem(currentPlayerKey, playerId)
}

export function getCurrentPlayerId() {
  return localStorage.getItem(currentPlayerKey) as Id<'players'> | null
}

export function clearCurrentPlayerId() {
  localStorage.removeItem(currentPlayerKey)
}
