import { Card } from '../../../shared/components/Card'
import type { Doc } from '../../../../convex/_generated/dataModel'
import type { Player } from '../data/mockRoom'
import { PlayerCard } from './PlayerCard'

type PlayerListProps = {
  players: Array<Doc<'players'> | Player>
  isEmpty?: boolean
}

function getPlayerKey(player: Doc<'players'> | Player) {
  return '_id' in player ? player._id : player.id
}

function isPlayerConnected(player: Doc<'players'> | Player) {
  if ('isConnected' in player) {
    return player.isConnected
  }

  return player.status !== 'disconnected'
}

export function PlayerList({ players, isEmpty = false }: PlayerListProps) {
  const connectedPlayers = players.filter(isPlayerConnected)
  const disconnectedPlayers = players.filter((player) => !isPlayerConnected(player))

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-xl font-bold">Operators</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
          {connectedPlayers.length} Active
        </span>
      </div>
      <div className="space-y-3">
        {isEmpty ? (
          <p className="rounded-[1.5rem] bg-surface-container p-4 text-sm text-on-surface-variant">
            No players have joined yet.
          </p>
        ) : null}
        {connectedPlayers.map((player) => (
          <PlayerCard key={getPlayerKey(player)} player={player} />
        ))}
        {disconnectedPlayers.length > 0 ? (
          <div className="space-y-3 pt-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
              Disconnected
            </p>
            {disconnectedPlayers.map((player) => (
              <PlayerCard key={getPlayerKey(player)} player={player} />
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  )
}
