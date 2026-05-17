import { Card } from '../../../shared/components/Card'
import type { Player } from '../data/mockRoom'
import { PlayerCard } from './PlayerCard'

type PlayerListProps = {
  players: Player[]
}

export function PlayerList({ players }: PlayerListProps) {
  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-xl font-bold">Operators</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
          {players.length} Active
        </span>
      </div>
      <div className="space-y-3">
        {players.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>
    </Card>
  )
}
