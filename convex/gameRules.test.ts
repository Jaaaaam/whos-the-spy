import { describe, expect, it } from 'vitest'
import {
  assignRandomRoles,
  getRecommendedSpyCount,
  isValidPlayerCount,
  isValidSpyCount,
} from './gameRules'
import type { Id } from './_generated/dataModel'

function playerId(id: string) {
  return id as Id<'players'>
}

describe('getRecommendedSpyCount', () => {
  it('recommends 1 spy for 3-6 players', () => {
    expect(getRecommendedSpyCount(3)).toBe(1)
    expect(getRecommendedSpyCount(6)).toBe(1)
  })

  it('recommends 2 spies for 7-10 players', () => {
    expect(getRecommendedSpyCount(7)).toBe(2)
    expect(getRecommendedSpyCount(10)).toBe(2)
  })

  it('recommends 3 spies for 11-15 players', () => {
    expect(getRecommendedSpyCount(11)).toBe(3)
    expect(getRecommendedSpyCount(15)).toBe(3)
  })
})

describe('isValidSpyCount', () => {
  it('prevents spy count from being 0', () => {
    expect(isValidSpyCount(5, 0)).toBe(false)
  })

  it('prevents spy count from being equal to or greater than half of players', () => {
    expect(isValidSpyCount(6, 3)).toBe(false)
    expect(isValidSpyCount(6, 4)).toBe(false)
  })

  it('allows spy count when it is at least 1 and less than half of players', () => {
    expect(isValidSpyCount(6, 2)).toBe(true)
  })
})

describe('isValidPlayerCount', () => {
  it('prevents player count from being below the minimum', () => {
    expect(isValidPlayerCount(2)).toBe(false)
  })

  it('allows player count at the minimum', () => {
    expect(isValidPlayerCount(3)).toBe(true)
  })

  it('allows player count at the maximum', () => {
    expect(isValidPlayerCount(15)).toBe(true)
  })

  it('prevents player count from being above the maximum', () => {
    expect(isValidPlayerCount(16)).toBe(false)
  })
})

describe('assignRandomRoles', () => {
  it('returns one assignment for every player', () => {
    const playerIds = [
      playerId('p1'),
      playerId('p2'),
      playerId('p3'),
      playerId('p4'),
    ]
    const assignments = assignRandomRoles(playerIds, 1)

    expect(assignments).toHaveLength(playerIds.length)
  })

  it('assigns the requested number of spies', () => {
    const expectedSpyCount = 2
    const playerIds = [
      playerId('p1'),
      playerId('p2'),
      playerId('p3'),
      playerId('p4'),
      playerId('p5'),
    ]
    const assignments = assignRandomRoles(playerIds, expectedSpyCount)
    const spies = assignments.filter(({ role }) => role === 'spy')

    expect(spies).toHaveLength(expectedSpyCount)
  })

  it('rejects a spy count of 0', () => {
    const playerIds = [
      playerId('p1'),
      playerId('p2'),
      playerId('p3'),
      playerId('p4'),
    ]

    expect(() => assignRandomRoles(playerIds, 0)).toThrow('Invalid spy count')
  })

  it('rejects a spy count equal to half of players', () => {
    const playerIds = [
      playerId('p1'),
      playerId('p2'),
      playerId('p3'),
      playerId('p4'),
    ]

    expect(() => assignRandomRoles(playerIds, 2)).toThrow('Invalid spy count')
  })

  it('uses the recommended spy count when spy count is not provided', () => {
    const playerIds = [
      playerId('p1'),
      playerId('p2'),
      playerId('p3'),
      playerId('p4'),
      playerId('p5'),
      playerId('p6'),
      playerId('p7'),
    ]
    const assignments = assignRandomRoles(playerIds, undefined)
    const spies = assignments.filter(({ role }) => role === 'spy')

    expect(spies).toHaveLength(2)
  })

  it('uses one spy by default for smaller rooms', () => {
    const playerIds = [
      playerId('p1'),
      playerId('p2'),
      playerId('p3'),
      playerId('p4'),
      playerId('p5'),
      playerId('p6'),
    ]
    const assignments = assignRandomRoles(playerIds, undefined)
    const spies = assignments.filter(({ role }) => role === 'spy')

    expect(spies).toHaveLength(1)
  })

  it('uses three spies by default for larger rooms', () => {
    const playerIds = [
      playerId('p1'),
      playerId('p2'),
      playerId('p3'),
      playerId('p4'),
      playerId('p5'),
      playerId('p6'),
      playerId('p7'),
      playerId('p8'),
      playerId('p9'),
      playerId('p10'),
      playerId('p11'),
    ]
    const assignments = assignRandomRoles(playerIds, undefined)
    const spies = assignments.filter(({ role }) => role === 'spy')

    expect(spies).toHaveLength(3)
  })

  it('assigns civilians to all non-spy players', () => {
    const playerIds = [
      playerId('p1'),
      playerId('p2'),
      playerId('p3'),
      playerId('p4'),
      playerId('p5'),
    ]
    const assignments = assignRandomRoles(playerIds, 2)
    const civilians = assignments.filter(({ role }) => role === 'civilian')

    expect(civilians).toHaveLength(3)
  })

  it('does not duplicate assigned players', () => {
    const playerIds = [
      playerId('p1'),
      playerId('p2'),
      playerId('p3'),
      playerId('p4'),
    ]
    const assignments = assignRandomRoles(playerIds, 1)
    const assignedPlayerIds = assignments.map(({ playerId }) => playerId)
    const uniqueAssignedPlayerIds = new Set(assignedPlayerIds)

    expect(uniqueAssignedPlayerIds.size).toBe(playerIds.length)
  })

  it('only assigns roles to players from the input', () => {
    const playerIds = [
      playerId('p1'),
      playerId('p2'),
      playerId('p3'),
    ]
    const assignments = assignRandomRoles(playerIds, 1)

    for (const assignment of assignments) {
      expect(playerIds).toContain(assignment.playerId)
    }
  })

  it('only assigns spy or civilian roles', () => {
    const playerIds = [
      playerId('p1'),
      playerId('p2'),
      playerId('p3'),
    ]
    const assignments = assignRandomRoles(playerIds, 1)

    for (const assignment of assignments) {
      expect(['spy', 'civilian']).toContain(assignment.role)
    }
  })

  it('does not mutate the original player ids', () => {
    const playerIds = [
      playerId('p1'),
      playerId('p2'),
      playerId('p3'),
      playerId('p4'),
    ]
    const originalPlayerIds = [...playerIds]

    assignRandomRoles(playerIds, 1)

    expect(playerIds).toEqual(originalPlayerIds)
  })
})
