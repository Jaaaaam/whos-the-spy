import { cn } from '../../../shared/lib/cn'
import type { Doc } from '../../../../convex/_generated/dataModel'
import { Button } from '../../../shared/components/Button'

type VotingCardProps = {
  player: Doc<'players'>
  isSelf: boolean
  isSelected: boolean
  isAbstained: boolean
  disabled: boolean
  isSubmitting: boolean
  onVote: () => void
}

export function VotingCard({ player, isSelf, isSelected, isAbstained, disabled, isSubmitting, onVote }: VotingCardProps) {
  const initials = player.name.slice(0, 2).toUpperCase()

  function getBadgeLabel() {
    if (isSelf) return isAbstained ? 'Abstained' : 'You'
    return isSelected ? 'Selected' : 'Suspect'
  }

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-[1.75rem] bg-surface-container p-5 transition ring-1 ring-transparent hover:bg-surface-bright',
        isSelf && 'opacity-60 grayscale',
        isSelected &&
        'bg-surface-container-high shadow-[0_0_24px_rgba(124,255,254,0.14)] ring-tertiary/30',
      )}
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary font-headline font-black text-surface">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-headline text-lg font-bold">{player.name}</h3>
        <span
          className={cn(
            'mt-1 inline-flex rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-on-secondary-container',
            isSelected && 'bg-tertiary/20 text-tertiary',
          )}
        >
          {getBadgeLabel()}
        </span>
      </div>
      {isSelf ? (
        <span className="material-symbols-outlined text-on-surface-variant/40">
          block
        </span>
      ) : (
        <Button
          className="px-4 py-2 text-xs"
          disabled={disabled}
          onClick={onVote}
          type="button"
        >
          {isSubmitting ? 'Voting...' : isSelected ? 'Selected' : 'Vote'}
        </Button>
      )}
    </div>
  )
}
