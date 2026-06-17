export function VsDivider() {
  return (
    <div className="relative flex flex-col items-center px-10">
      <div className="absolute hidden h-full w-px bg-gradient-to-b from-transparent via-outline-variant/30 to-transparent md:block" />
      <span className="vs-glitch font-headline text-8xl font-black italic tracking-tighter text-white/20 sm:text-9xl">
        VS
      </span>
    </div>
  )
}
