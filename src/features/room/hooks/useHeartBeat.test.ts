import { renderHook } from '@testing-library/react'
import { useMutation } from 'convex/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HEARTBEAT_INTERVAL_FE_MS } from '../../../../convex/game/constants'
import { useHeartbeat } from './useHeartBeat'

vi.mock('convex/react', () => ({
  useMutation: vi.fn(),
}))

vi.mock('../../../../convex/_generated/api', () => ({
  api: { players: { heartbeat: 'players:heartbeat' } },
}))

const roomId = 'room_1' as Parameters<typeof useHeartbeat>[0]
const playerId = 'player_1' as Parameters<typeof useHeartbeat>[1]

describe('useHeartbeat', () => {
  let sendHeartbeat: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    sendHeartbeat = vi.fn()
    vi.mocked(useMutation).mockReturnValue(sendHeartbeat)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls sendHeartbeat on each interval tick', () => {
    renderHook(() => useHeartbeat(roomId, playerId))

    expect(sendHeartbeat).not.toHaveBeenCalled()

    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_FE_MS)
    expect(sendHeartbeat).toHaveBeenCalledTimes(1)
    expect(sendHeartbeat).toHaveBeenCalledWith({ playerId, roomId })

    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_FE_MS)
    expect(sendHeartbeat).toHaveBeenCalledTimes(2)
  })

  it('does not start the interval when roomId is undefined', () => {
    renderHook(() => useHeartbeat(undefined, playerId))

    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_FE_MS * 3)

    expect(sendHeartbeat).not.toHaveBeenCalled()
  })

  it('does not start the interval when playerId is undefined', () => {
    renderHook(() => useHeartbeat(roomId, undefined))

    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_FE_MS * 3)

    expect(sendHeartbeat).not.toHaveBeenCalled()
  })

  it('clears the interval on unmount', () => {
    const { unmount } = renderHook(() => useHeartbeat(roomId, playerId))

    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_FE_MS)
    expect(sendHeartbeat).toHaveBeenCalledTimes(1)

    unmount()

    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_FE_MS * 3)
    expect(sendHeartbeat).toHaveBeenCalledTimes(1)
  })

  it('restarts the interval when roomId changes', () => {
    const newRoomId = 'room_2' as typeof roomId
    const { rerender } = renderHook(
      ({ rid }: { rid: typeof roomId }) => useHeartbeat(rid, playerId),
      { initialProps: { rid: roomId } },
    )

    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_FE_MS)
    expect(sendHeartbeat).toHaveBeenCalledWith({ playerId, roomId })

    rerender({ rid: newRoomId })
    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_FE_MS)
    expect(sendHeartbeat).toHaveBeenCalledWith({ playerId, roomId: newRoomId })
  })
})
