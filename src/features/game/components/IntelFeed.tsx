import { Card } from '../../../shared/components/Card'

export function IntelFeed() {
  return (
    <Card tone="low" className="flex h-full flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-headline text-xl font-bold">
          <span className="material-symbols-outlined text-tertiary">terminal</span>
          Intel Feed
        </h2>
        <span className="rounded bg-error/20 px-2 py-0.5 text-[10px] font-bold uppercase text-error">
          Live
        </span>
      </div>
      <div className="space-y-4">
        {[
          ['Alex', 'Mika keeps answering like the word is a dessert. Suspicious.'],
          ['Dani', 'Carlo laughed before the clue. I am logging that.'],
          ['System', 'Jam has cast a placeholder vote.'],
        ].map(([name, text]) => (
          <div key={text} className="rounded-[1rem] bg-surface-container-highest p-4">
            <p className="text-xs font-bold text-tertiary">{name}</p>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-auto flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-[1rem] border-0 bg-surface-container-lowest px-4 py-3 text-sm outline-none ring-1 ring-outline-variant/10 placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-tertiary"
          placeholder="Share findings..."
        />
        <button className="rounded-[1rem] bg-surface-container-highest px-4 text-tertiary">
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>
    </Card>
  )
}
