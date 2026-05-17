import type { Player } from '../../room/data/mockRoom'
import { Button } from '../../../shared/components/Button'
import { cn } from '../../../shared/lib/cn'

type VotingCardProps = {
  player: Player
  isSelf?: boolean
  highlighted?: boolean
}

export function VotingCard({ player, isSelf = false, highlighted = false }: VotingCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-[1.75rem] bg-surface-container p-5 transition ring-1 ring-transparent hover:bg-surface-bright',
        isSelf && 'opacity-60 grayscale',
        highlighted &&
          'bg-surface-container-high shadow-[0_0_24px_rgba(124,255,254,0.14)] ring-tertiary/30',
      )}
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary font-headline font-black text-surface">
        {player.avatar}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-headline text-lg font-bold">{player.name}</h3>
        <span
          className={cn(
            'mt-1 inline-flex rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-on-secondary-container',
            highlighted && 'bg-tertiary/20 text-tertiary',
          )}
        >
          {isSelf ? 'You' : highlighted ? 'Voted You' : 'Suspect'}
        </span>
      </div>
      {isSelf ? (
        <span className="material-symbols-outlined text-on-surface-variant/40">block</span>
      ) : (
        <Button className="px-4 py-2 text-xs">Vote</Button>
      )}
    </div>
  )
}
