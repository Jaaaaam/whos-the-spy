import { useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import type { GameMode } from '../../../../shared/gameMode'
import { getConvexErrorMessage } from '../../../shared/lib/getConvexErrorMessage'

type SetRoomModeArgs = {
  roomId: Id<'rooms'>
  hostPlayerId: Id<'players'>
  mode: GameMode
}

export function useSetRoomMode() {
  const setRoomModeMutation = useMutation(api.rooms.setRoomMode)
  const [isSettingMode, setIsSettingMode] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function setRoomMode({ roomId, hostPlayerId, mode }: SetRoomModeArgs) {
    setIsSettingMode(true)
    setError(null)

    try {
      return await setRoomModeMutation({ roomId, hostPlayerId, mode })
    } catch (error) {
      const message = getConvexErrorMessage(error, 'Unable to change game mode.')
      setError(message)
      throw error
    } finally {
      setIsSettingMode(false)
    }
  }

  return { setRoomMode, isSettingMode, error }
}
