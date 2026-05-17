import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '../lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-primary to-primary-container text-on-primary-container shadow-[0_10px_40px_rgba(161,142,255,0.35)] hover:scale-[1.02]',
  secondary:
    'bg-surface-container-highest text-tertiary ring-1 ring-tertiary/15 hover:bg-surface-bright',
  ghost: 'bg-transparent text-tertiary hover:bg-tertiary/10',
  danger: 'bg-error/10 text-error ring-1 ring-error/20 hover:bg-error/20',
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-headline text-sm font-extrabold uppercase tracking-widest transition active:scale-95 disabled:pointer-events-none disabled:opacity-50'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  children: ReactNode
}

type ButtonLinkProps = LinkProps & {
  variant?: ButtonVariant
  children: ReactNode
}

export function Button({
  className,
  variant = 'primary',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(baseClasses, variantClasses[variant], className)}
      {...props}
    >
      {children}
    </button>
  )
}

export function ButtonLink({
  className,
  variant = 'primary',
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(baseClasses, variantClasses[variant], className)} {...props}>
      {children}
    </Link>
  )
}
