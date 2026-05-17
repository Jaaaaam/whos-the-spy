type TimerProps = {
  label: string
  value: string
  progress?: number
  urgent?: boolean
}

export function Timer({ label, value, progress = 70, urgent = false }: TimerProps) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-surface-container-high p-6 text-center ring-1 ring-outline-variant/10">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
      <div className="relative">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          {label}
        </p>
        <div
          className={`font-headline text-5xl font-black tracking-tight ${
            urgent ? 'text-error' : 'text-white'
          }`}
        >
          {value}
        </div>
        <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-surface-container-highest">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-tertiary to-primary"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_#fff]"
            style={{ left: `calc(${progress}% - 4px)` }}
          />
        </div>
      </div>
    </div>
  )
}
