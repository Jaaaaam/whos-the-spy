function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

interface SuspectCardProps {
  name: string
}

export function SuspectCard({ name }: SuspectCardProps) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        <div className="flex h-36 w-36 items-center justify-center rounded-[2rem] bg-gradient-to-br from-error to-primary font-headline text-5xl font-black text-surface shadow-[0_0_40px_rgba(253,111,133,0.25)] ring-2 ring-error/30">
          {getInitials(name)}
        </div>
        <div className="absolute -right-2 -top-2 rounded-full bg-surface-container-high px-3 py-0.5 text-[9px] font-black uppercase tracking-widest text-tertiary ring-1 ring-tertiary/30">
          Tied
        </div>
      </div>
      <div className="text-center">
        <h2 className="font-headline text-2xl font-bold">{name}</h2>
        <span className="mt-2 inline-flex rounded-full bg-error/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-error ring-1 ring-error/20">
          Under Suspicion
        </span>
      </div>
    </div>
  )
}
