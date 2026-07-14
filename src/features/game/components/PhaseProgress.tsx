type PhaseProgressProps = {
  label: string
  doneCount: number
  totalCount: number
  secondsRemaining: number | null
}

export function PhaseProgress({ label, doneCount, totalCount, secondsRemaining }: PhaseProgressProps) {
  return (
    <div className="rounded-[1.5rem] bg-surface-container-highest/40 px-6 py-4 ring-1 ring-outline-variant/10">
      <p className="text-xs font-bold uppercase tracking-[0.35em] text-on-surface-variant">
        {label}
      </p>
      <p className="mt-2 font-headline text-4xl font-black text-tertiary">
        {doneCount}/{totalCount}
      </p>
      {secondsRemaining !== null ? (
        <p className="mt-1 text-sm font-semibold text-on-surface-variant">
          {secondsRemaining}s remaining
        </p>
      ) : null}
    </div>
  )
}
