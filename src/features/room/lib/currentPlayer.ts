import type { Id } from '../../../../convex/_generated/dataModel'

const currentPlayerKey = 'whos-the-spy.currentPlayerId'
const storage = () => (import.meta.env.DEV ? sessionStorage : localStorage)

export function saveCurrentPlayerId(playerId: Id<'players'>) {
  storage().setItem(currentPlayerKey, playerId)
}

export function getCurrentPlayerId() {
  return storage().getItem(currentPlayerKey) as Id<'players'> | null
}

export function clearCurrentPlayerId() {
  storage().removeItem(currentPlayerKey)
}
