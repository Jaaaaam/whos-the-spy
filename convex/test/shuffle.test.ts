import { afterEach, describe, expect, it, vi } from 'vitest'
import { shuffle } from '../lib/shuffle'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('shuffle', () => {
  it('returns every item exactly once', () => {
    const items = ['a', 'b', 'c', 'd']

    const shuffled = shuffle(items)

    expect(shuffled).toHaveLength(items.length)
    expect(new Set(shuffled)).toEqual(new Set(items))
  })

  it('does not mutate the original array', () => {
    const items = ['a', 'b', 'c', 'd']

    shuffle(items)

    expect(items).toEqual(['a', 'b', 'c', 'd'])
  })

  it('returns an empty array for empty input', () => {
    expect(shuffle([])).toEqual([])
  })

  it('returns a single item unchanged', () => {
    expect(shuffle(['a'])).toEqual(['a'])
  })

  it('uses Fisher-Yates swaps to produce a deterministic order', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)

    expect(shuffle(['a', 'b', 'c', 'd'])).toEqual(['b', 'c', 'd', 'a'])
  })
})
