import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  tone?: 'default' | 'high' | 'low' | 'glass'
}

const tones = {
  default: 'bg-surface-container',
  high: 'bg-surface-container-high',
  low: 'bg-surface-container-low',
  glass: 'glass-panel',
}

export function Card({
  children,
  className,
  tone = 'default',
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[2rem] p-6 shadow-[0_20px_60px_-20px_rgba(161,142,255,0.25)] ring-1 ring-outline-variant/10',
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
