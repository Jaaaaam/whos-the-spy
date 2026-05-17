import { Card } from '../../../shared/components/Card'

type RoomCodeProps = {
  code: string
}

export function RoomCode({ code }: RoomCodeProps) {
  return (
    <Card tone="high" className="text-center">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-tertiary">
        Private Room Code
      </p>
      <div className="rounded-[1.5rem] bg-surface-container-lowest px-5 py-5 font-headline text-4xl font-black tracking-[0.25em] text-on-surface sm:text-6xl">
        {code}
      </div>
      <p className="mt-4 text-sm text-on-surface-variant">
        Share this code or invite link with friends.
      </p>
    </Card>
  )
}
