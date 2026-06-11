import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Id } from '../../../../convex/_generated/dataModel'
import { clearCurrentPlayerId, getCurrentPlayerId, saveCurrentPlayerId } from './currentPlayer'

const playerId = 'player_1' as Id<'players'>
const storageKey = 'whos-the-spy.currentPlayerId'

describe('currentPlayer (DEV mode)', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', true)
    sessionStorage.clear()
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('saveCurrentPlayerId', () => {
    it('writes playerId to sessionStorage, not localStorage', () => {
      saveCurrentPlayerId(playerId)

      expect(sessionStorage.getItem(storageKey)).toBe(playerId)
      expect(localStorage.getItem(storageKey)).toBeNull()
    })
  })

  describe('getCurrentPlayerId', () => {
    it('returns playerId from sessionStorage', () => {
      sessionStorage.setItem(storageKey, playerId)

      expect(getCurrentPlayerId()).toBe(playerId)
    })

    it('returns null when sessionStorage is empty', () => {
      expect(getCurrentPlayerId()).toBeNull()
    })
  })

  describe('clearCurrentPlayerId', () => {
    it('removes playerId from sessionStorage', () => {
      sessionStorage.setItem(storageKey, playerId)
      clearCurrentPlayerId()

      expect(sessionStorage.getItem(storageKey)).toBeNull()
    })
  })
})

describe('currentPlayer (production mode)', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', false)
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('saveCurrentPlayerId', () => {
    it('writes playerId to localStorage', () => {
      saveCurrentPlayerId(playerId)

      expect(localStorage.getItem(storageKey)).toBe(playerId)
    })

    it('does not write to sessionStorage', () => {
      saveCurrentPlayerId(playerId)

      expect(sessionStorage.getItem(storageKey)).toBeNull()
    })
  })

  describe('getCurrentPlayerId', () => {
    it('reads playerId from localStorage', () => {
      localStorage.setItem(storageKey, playerId)

      expect(getCurrentPlayerId()).toBe(playerId)
    })

    it('returns null when localStorage is empty', () => {
      expect(getCurrentPlayerId()).toBeNull()
    })
  })

  describe('clearCurrentPlayerId', () => {
    it('removes playerId from localStorage', () => {
      localStorage.setItem(storageKey, playerId)
      clearCurrentPlayerId()

      expect(localStorage.getItem(storageKey)).toBeNull()
    })
  })
})
