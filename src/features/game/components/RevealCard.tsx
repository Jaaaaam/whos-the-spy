import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'

type RevealCardProps = {
  word: string | null
  category?: string | null
  secondsRemaining: number
  onMarkRoleSeen: () => void
  isMarkingSeen: boolean
  hasMarkedRoleSeen: boolean
}

export function RevealCard({
  word,
  category,
  secondsRemaining,
  onMarkRoleSeen,
  isMarkingSeen,
  hasMarkedRoleSeen,
}: RevealCardProps) {

  return (
    <Card tone="glass" className="relative overflow-hidden text-center">
      <div className="absolute inset-0 noise-grid opacity-10" />
      <div className="relative mx-auto max-w-2xl space-y-8">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-surface-container-highest text-tertiary">
          <span className="material-symbols-outlined text-5xl">
            {word === null ? 'visibility_off' : 'key'}
          </span>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-tertiary">
            {word === null ? 'Your Briefing' : 'Your Secret Word'}
          </p>
          <h1 className="mt-4 font-headline text-5xl font-black tracking-tight sm:text-7xl">
            {word === null ? 'No Word. Blend In.' : 'Keep It Quiet'}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-on-surface-variant">
            {word === null
              ? 'You are the spy. You know the category — listen closely and act like you got a word.'
              : 'Use this word during discussion, but do not reveal it too clearly.'}
          </p>
        </div>
        {word !== null ? (
          <div className="rounded-[2rem] bg-surface-container-highest/70 p-8 ring-1 ring-outline-variant/20">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-on-surface-variant">
              Secret Word
            </p>
            <div className="mt-3 font-headline text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-on-surface-variant sm:text-7xl">
              {word}
            </div>
          </div>
        ) : null}
        {category ? (
          <div className="rounded-[2rem] bg-surface-container-highest/70 p-8 ring-1 ring-outline-variant/20">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-on-surface-variant">
              Category
            </p>
            <div className="mt-3 font-headline text-4xl font-black text-tertiary sm:text-5xl">
              {category}
            </div>
          </div>
        ) : null}
        <div className="rounded-[1.5rem] bg-surface-container-highest/40 px-6 py-4 ring-1 ring-outline-variant/10">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-on-surface-variant">
            Discussion starts in
          </p>
          <p className="mt-2 font-headline text-4xl font-black text-tertiary">
            {secondsRemaining}s
          </p>
        </div>
        {hasMarkedRoleSeen ? (
          <p className="rounded-[1.5rem] bg-tertiary/10 px-6 py-4 text-sm font-semibold text-tertiary">
            Ready. Waiting for the rest of the players...
          </p>
        ) : (
          <Button onClick={onMarkRoleSeen} disabled={isMarkingSeen}>
            {isMarkingSeen ? 'Confirming...' : 'I Understand'}
          </Button>
        )}
      </div>
    </Card>
  )
}
