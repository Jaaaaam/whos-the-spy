import { describe, expect, it } from 'vitest'
import { createRoomHandler } from '../rooms'
import { createCtx, type StoredTables } from './gameTestUtils'

describe('createRoomHandler', () => {
  it('stores the created host player on the room', async () => {
    const tables: StoredTables = {
      rooms: [],
      players: [],
      rounds: [],
      roleAssignments: [],
    }
    const ctx = createCtx(tables)

    const result = await createRoomHandler(ctx, {
      playerName: 'Jam',
    })

    expect(result.playerId).toBe(tables.players[0]._id)
    expect(result.room?.hostPlayerId).toBe(result.playerId)
    expect(tables.players[0]).toMatchObject({
      roomId: result.room?._id,
      name: 'Jam',
      isHost: true,
      isConnected: true,
    })
  })
})
