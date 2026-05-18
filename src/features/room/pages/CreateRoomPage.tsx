import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { PageShell } from '../../../shared/layouts/PageShell'
import { mockRoom } from '../data/mockRoom'
import { useCreateRoom } from '../hooks/useCreateRoom'

export function CreateRoomPage() {
  const navigate = useNavigate()
  const { createRoom, isCreating, error } = useCreateRoom()
  const [playerName, setPlayerName] = useState('Jam')
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = playerName.trim()
    if (!trimmedName) {
      setValidationError('Enter your name before creating a room.')
      return
    }

    setValidationError(null)
    const result = await createRoom(trimmedName)

    if (result?.code) {
      navigate(`/room/${result.code}`)
    }
  }

  return (
    <PageShell compact>
      <div className="space-y-6 py-8">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-tertiary">
            Host Setup
          </p>
          <h1 className="mt-4 font-headline text-4xl font-black tracking-tight sm:text-6xl">
            Create a Room
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-on-surface-variant">
            Static first-pass UI for choosing the session vibe before friends join.
          </p>
        </div>

        <Card className="space-y-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
          <label className="space-y-2 block">
            <span className="text-xs font-bold uppercase tracking-widest text-tertiary">
              Your Name
            </span>
            <input
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              className="w-full rounded-[1rem] border-0 bg-surface-container-lowest px-4 py-4 text-on-surface outline-none ring-1 ring-outline-variant/10 focus:ring-2 focus:ring-tertiary"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-tertiary">
                Category
              </span>
              <select
                defaultValue={mockRoom.category}
                className="w-full rounded-[1rem] border-0 bg-surface-container-lowest px-4 py-4 text-on-surface outline-none ring-1 ring-outline-variant/10 focus:ring-2 focus:ring-tertiary"
              >
                <option>Food</option>
                <option>Places</option>
                <option>Movies</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-tertiary">
                Round Timer
              </span>
              <select
                defaultValue={mockRoom.timer}
                className="w-full rounded-[1rem] border-0 bg-surface-container-lowest px-4 py-4 text-on-surface outline-none ring-1 ring-outline-variant/10 focus:ring-2 focus:ring-tertiary"
              >
                <option>03:00</option>
                <option>05:00</option>
                <option>08:00</option>
              </select>
            </label>
          </div>
          <div className="rounded-[1.5rem] bg-surface-container-high p-5">
            <p className="text-sm text-on-surface-variant">
              Category and timer are still visual placeholders. The room and players
              now come from Convex in realtime.
            </p>
          </div>
          {validationError || error ? (
            <p className="text-sm font-medium text-error">{validationError ?? error}</p>
          ) : null}
          <Button className="w-full py-5 text-base" disabled={isCreating} type="submit">
            {isCreating ? 'Creating...' : 'Create New Game'}
          </Button>
          </form>
        </Card>
      </div>
    </PageShell>
  )
}
