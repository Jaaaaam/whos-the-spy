import { describe, expect, it } from 'vitest'
import { getConvexErrorMessage } from './getConvexErrorMessage'

describe('getConvexErrorMessage', () => {
  it('removes the Convex uncaught error prefix', () => {
    const error = new Error('Uncaught Error: Room is full')

    expect(getConvexErrorMessage(error)).toBe('Room is full')
  })

  it('returns a generic message for non-error values', () => {
    expect(getConvexErrorMessage('failed')).toBe('Something went wrong')
  })

  it('returns the fallback message when an error has no message', () => {
    expect(getConvexErrorMessage(new Error(), 'Please try again.')).toBe('Please try again.')
  })
})
