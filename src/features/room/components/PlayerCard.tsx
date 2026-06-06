import type { Doc } from '../../../../convex/_generated/dataModel'
import type { Player } from '../data/mockRoom'
import { cn } from '../../../shared/lib/cn'

type PlayerCardProps = {
  player: Doc<'players'> | Player
  interactive?: boolean
}

const statusLabel = {
  ready: 'Ready',
  waiting: 'Waiting',
  speaking: 'Speaking',
  voted: 'Voted',
  connected: 'Connected',
  disconnected: 'Disconnected',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part.at(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getPlayerAvatar(player: Doc<'players'> | Player) {
  return 'avatar' in player ? player.avatar : getInitials(player.name)
}

function getPlayerStatus(player: Doc<'players'> | Player) {
  if ('status' in player) {
    return player.status
  }

  return player.isConnected ? 'connected' : 'disconnected'
}

export function PlayerCard({ player, interactive = false }: PlayerCardProps) {
  const status = getPlayerStatus(player)

  return (
    <div
      className={cn(
        'relative flex items-center gap-4 rounded-[1.5rem] bg-surface-container p-4 transition ring-1 ring-outline-variant/10',
        status === 'speaking' &&
          'bg-surface-bright/70 shadow-[0_0_28px_rgba(124,255,254,0.12)] ring-tertiary/25',
        status === 'disconnected' && 'opacity-60',
        interactive && 'hover:bg-surface-bright',
      )}
    >
      {status === 'speaking' ? (
        <span className="absolute left-0 top-5 h-12 w-1 rounded-full bg-tertiary" />
      ) : null}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br from-primary to-secondary font-headline font-black text-surface">
        {getPlayerAvatar(player)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-headline font-bold text-on-surface">{player.name}</p>
          {player.isHost ? (
            <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-on-secondary-container">
              Host
            </span>
          ) : null}
        </div>
        <p
          className={cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60',
            (status === 'connected' || status === 'speaking') && 'text-tertiary',
            status === 'disconnected' && 'text-on-surface-variant/50',
          )}
        >
          {statusLabel[status]}
        </p>
      </div>
      <span
        className={cn(
          'h-2.5 w-2.5 rounded-full bg-outline',
          (status === 'ready' || status === 'connected') && 'bg-primary',
          status === 'speaking' && 'bg-tertiary shadow-[0_0_12px_#7cfffe]',
          status === 'voted' && 'bg-secondary',
        )}
      />
    </div>
  )
}
