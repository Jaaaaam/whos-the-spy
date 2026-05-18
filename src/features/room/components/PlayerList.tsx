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

export function PlayerList({ players, isEmpty = false }: PlayerListProps) {
  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-xl font-bold">Operators</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
          {players.length} Active
        </span>
      </div>
      <div className="space-y-3">
        {isEmpty ? (
          <p className="rounded-[1.5rem] bg-surface-container p-4 text-sm text-on-surface-variant">
            No players have joined yet.
          </p>
        ) : null}
        {players.map((player) => (
          <PlayerCard key={getPlayerKey(player)} player={player} />
        ))}
      </div>
    </Card>
  )
}
