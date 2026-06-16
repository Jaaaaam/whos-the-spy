import { cn } from '../lib/cn'

type LoaderProps = {
  label?: string
  fullPage?: boolean
  className?: string
}

export function Loader({ label, fullPage = false, className }: LoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        fullPage && 'min-h-[calc(100vh-7rem)]',
        className,
      )}
    >
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-outline-variant/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary border-r-tertiary" />
        <div className="absolute inset-[6px] animate-pulse rounded-full bg-primary/10" />
      </div>
      {label ? (
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-on-surface-variant">
          {label}
        </p>
      ) : null}
    </div>
  )
}
