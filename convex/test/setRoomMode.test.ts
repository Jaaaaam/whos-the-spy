import { describe, expect, it } from 'vitest'
import { GAME_MODE } from '../../shared/gameMode'
import { GAME_STATUS } from '../../shared/gameStatus'
import { GAME_ERROR } from '../game/errors'
import { setRoomModeHandler } from '../rooms'
import {
  createCtx,
  createPlayer,
  createRoom,
  createRoomWithStatus,
  playerId,
  roomId,
  type StoredTables,
} from './gameTestUtils'

function makeTables(overrides: Partial<StoredTables> = {}): StoredTables {
  const currentRoomId = roomId('room_1')
  return {
    rooms: [createRoom(currentRoomId)],
    players: [
      createPlayer(playerId('player_1'), currentRoomId, true),
      createPlayer(playerId('player_2'), currentRoomId),
    ],
    rounds: [],
    roleAssignments: [],
    ...overrides,
  }
}

describe('setRoomModeHandler', () => {
  it('lets the host set the room mode while in the lobby', async () => {
    const tables = makeTables()
    const ctx = createCtx(tables)

    const result = await setRoomModeHandler(ctx, {
      roomId: roomId('room_1'),
      hostPlayerId: playerId('player_1'),
      mode: GAME_MODE.WORDLESS_SPY,
    })

    expect(result.mode).toBe(GAME_MODE.WORDLESS_SPY)
    expect(tables.rooms[0].mode).toBe(GAME_MODE.WORDLESS_SPY)
  })

  it('rejects non-hosts', async () => {
    const tables = makeTables()
    const ctx = createCtx(tables)

    await expect(
      setRoomModeHandler(ctx, {
        roomId: roomId('room_1'),
        hostPlayerId: playerId('player_2'),
        mode: GAME_MODE.WORDLESS_SPY,
      }),
    ).rejects.toThrow(GAME_ERROR.NOT_HOST)
  })

  it('rejects when the room is not in the lobby', async () => {
    const tables = makeTables({
      rooms: [createRoomWithStatus(roomId('room_1'), GAME_STATUS.DISCUSSION)],
    })
    const ctx = createCtx(tables)

    await expect(
      setRoomModeHandler(ctx, {
        roomId: roomId('room_1'),
        hostPlayerId: playerId('player_1'),
        mode: GAME_MODE.SIMILAR_WORDS,
      }),
    ).rejects.toThrow(GAME_ERROR.ROOM_NOT_IN_LOBBY)
  })
})
