import type { ReactNode } from 'react'
import { ButtonLink } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'

type MenuCardProps = {
  title: string
  description: string
  icon: string
  to: string
  action: string
  children?: ReactNode
}

export function MenuCard({
  title,
  description,
  icon,
  to,
  action,
  children,
}: MenuCardProps) {
  return (
    <Card className="flex h-full flex-col justify-between gap-6">
      <div className="space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-surface-container-highest text-3xl text-tertiary">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div>
          <h3 className="font-headline text-2xl font-bold">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
        </div>
      </div>
      {children}
      <ButtonLink to={to} className="w-full">
        {action}
      </ButtonLink>
    </Card>
  )
}
