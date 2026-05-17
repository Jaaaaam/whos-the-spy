import { ButtonLink } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { mockGame } from '../data/mockGame'

type RevealCardProps = {
  isSpy?: boolean
}

export function RevealCard({ isSpy = false }: RevealCardProps) {
  return (
    <Card tone="glass" className="relative overflow-hidden text-center">
      <div className="absolute inset-0 noise-grid opacity-10" />
      <div className="relative mx-auto max-w-2xl space-y-8">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-surface-container-highest text-tertiary">
          <span className="material-symbols-outlined text-5xl">
            {isSpy ? 'visibility_off' : 'key'}
          </span>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-tertiary">
            Your Secret Role
          </p>
          <h1 className="mt-4 font-headline text-5xl font-black tracking-tight sm:text-7xl">
            {isSpy ? 'YOU ARE THE SPY' : 'YOU ARE A VILLAGER'}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-on-surface-variant">
            {isSpy
              ? 'You do not know the secret word. Listen carefully and pretend you belong.'
              : 'You know the word. Ask smart questions without giving it away.'}
          </p>
        </div>
        <div className="rounded-[2rem] bg-surface-container-highest/70 p-8 ring-1 ring-outline-variant/20">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-on-surface-variant">
            {isSpy ? 'Category' : 'Secret Word'}
          </p>
          <div className="mt-3 font-headline text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-on-surface-variant sm:text-7xl">
            {isSpy ? mockGame.category : mockGame.secretWord}
          </div>
        </div>
        <ButtonLink to="/room/demo/discussion" className="w-full py-5 text-base">
          I Understand
        </ButtonLink>
      </div>
    </Card>
  )
}
