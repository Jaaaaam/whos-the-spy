import { useNavigate } from 'react-router-dom'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { PageShell } from '../../../shared/layouts/PageShell'
import { mockRoom } from '../data/mockRoom'

export function JoinRoomPage() {
  const navigate = useNavigate()

  return (
    <PageShell compact>
      <div className="space-y-6 py-8">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-tertiary">
            Infiltrate
          </p>
          <h1 className="mt-4 font-headline text-4xl font-black tracking-tight sm:text-6xl">
            Join a Room
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-on-surface-variant">
            Enter the private code from your host. This screen uses mock navigation only.
          </p>
        </div>

        <Card className="space-y-6">
          <label className="space-y-2 block">
            <span className="text-xs font-bold uppercase tracking-widest text-tertiary">
              Your Name
            </span>
            <input
              defaultValue="Alex"
              className="w-full rounded-[1rem] border-0 bg-surface-container-lowest px-4 py-4 text-on-surface outline-none ring-1 ring-outline-variant/10 focus:ring-2 focus:ring-tertiary"
            />
          </label>
          <label className="space-y-2 block">
            <span className="text-xs font-bold uppercase tracking-widest text-tertiary">
              Room Code
            </span>
            <input
              defaultValue={mockRoom.code}
              maxLength={6}
              className="w-full rounded-[1rem] border-0 bg-surface-container-lowest px-4 py-5 text-center font-headline text-3xl font-black uppercase tracking-[0.35em] text-on-surface outline-none ring-1 ring-outline-variant/10 focus:ring-2 focus:ring-tertiary"
            />
          </label>
          <Button className="w-full py-5 text-base" onClick={() => navigate('/room/demo')}>
            Enter Lobby
          </Button>
        </Card>
      </div>
    </PageShell>
  )
}
