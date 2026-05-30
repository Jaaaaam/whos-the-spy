import { MAX_PLAYERS_PER_ROOM, MIN_PLAYERS_PER_ROOM } from "../shared/gameSettings"
import type { Id } from "./_generated/dataModel"

export type PlayerRole = 'spy' | 'civilian'

export type PlayerRoleAssignment = {
  playerId: Id<'players'>
  role: PlayerRole
}

function shuffle<T>(items: T[]) {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const currentItem = shuffled[index]
    shuffled[index] = shuffled[randomIndex]
    shuffled[randomIndex] = currentItem
  }
  return shuffled
}

export function getRecommendedSpyCount(playerCount: number) {
  if (playerCount <= 6) return 1
  if (playerCount <= 10) return 2
  return 3
}

export function isValidSpyCount(playerCount: number, spyCount: number) {
  return spyCount >= 1 && spyCount < (playerCount / 2)
}

export function isValidPlayerCount(playerCount: number) {
  return playerCount >= MIN_PLAYERS_PER_ROOM && playerCount <= MAX_PLAYERS_PER_ROOM;
}

export function assignRandomRoles(playerIds: Id<'players'>[], spyCount: number | undefined): PlayerRoleAssignment[] {
  const currentSpyCount = spyCount ?? getRecommendedSpyCount(playerIds.length)

  if (!isValidSpyCount(playerIds.length, currentSpyCount)) {
    throw new Error('Invalid spy count')
  }

  const shuffledPlayerIds = shuffle(playerIds);
  const spyIds = new Set(shuffledPlayerIds.slice(0, currentSpyCount))

  return playerIds.map(playerId => ({
    playerId,
    role: spyIds.has(playerId) ? 'spy' : 'civilian'
  }))
}
