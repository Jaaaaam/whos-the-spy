import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { MAX_PLAYERS_PER_ROOM } from '../../../../shared/gameSettings'
import { Button } from '../../../shared/components/Button'
import { PageShell } from '../../../shared/layouts/PageShell'
import { cn } from '../../../shared/lib/cn'
import { useCreateRoom } from '../hooks/useCreateRoom'

const discussionTimerOptions = [
  { label: '1 min', value: 60_000 },
  { label: '2 min', value: 120_000 },
  { label: '3 min', value: 180_000 },
] as const

const minPlayersToStart = 4

export function CreateRoomPage() {
  const navigate = useNavigate()
  const { createRoom, isCreating, error } = useCreateRoom()
  const [playerName, setPlayerName] = useState('')
  const [discussionTurnDurationMs, setDiscussionTurnDurationMs] = useState<60000 | 120000 | 180000>(60_000)
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = playerName.trim()
    if (!trimmedName) {
      setValidationError('Enter your name before creating a room.')
      return
    }

    setValidationError(null)
    const result = await createRoom(trimmedName, discussionTurnDurationMs)

    if (result?.code) {
      navigate(`/room/${result.code}`)
    }
  }

  return (
    <PageShell showFooter={false}>
      <form className="space-y-8 py-6 lg:py-10" onSubmit={handleSubmit}>
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-tertiary">
              Host Setup
            </p>
            <h1 className="mt-4 font-headline text-4xl font-black tracking-tight sm:text-6xl">
              Room Configuration
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-on-surface-variant sm:text-lg">
              Set the round parameters before your squad joins the lobby.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-tertiary/20 bg-tertiary/10 px-4 py-2 text-tertiary">
            <span className="material-symbols-outlined text-sm">verified_user</span>
            <span className="text-xs font-bold uppercase tracking-widest">
              Host Privileges Active
            </span>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-12">
          <section className="rounded-[1.5rem] bg-surface-container/70 p-5 ring-1 ring-outline-variant/10 backdrop-blur-xl sm:p-8 lg:col-span-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-tertiary">
                  Access Point
                </p>
                <h2 className="mt-2 font-headline text-2xl font-black">
                  Host Identity
                </h2>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-highest text-primary">
                <span className="material-symbols-outlined">admin_panel_settings</span>
              </span>
            </div>
            <label className="mt-8 block space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Your Name
              </span>
              <input
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="YOUR CODENAME..."
                className="w-full rounded-[1rem] border-0 bg-surface-container-lowest px-4 py-4 text-lg font-bold text-on-surface outline-none ring-1 ring-outline-variant/10 transition focus:ring-2 focus:ring-tertiary"
              />
            </label>
          </section>

          <section className="rounded-[1.5rem] bg-surface-container/70 p-5 ring-1 ring-outline-variant/10 backdrop-blur-xl sm:p-8 lg:col-span-4">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-tertiary">
              Discussion Phase
            </p>
            <h2 className="mt-2 font-headline text-2xl font-black">Turn Timer</h2>
            <div className="my-6 grid grid-cols-3 gap-3">
              {discussionTimerOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDiscussionTurnDurationMs(option.value)}
                  className={cn(
                    'rounded-[1rem] px-4 py-4 font-headline font-black transition ring-1',
                    discussionTurnDurationMs === option.value
                      ? 'bg-primary-container text-on-primary-container shadow-[0_10px_30px_rgba(161,142,255,0.22)] ring-primary/20'
                      : 'bg-surface-container-highest text-on-surface-variant ring-transparent hover:text-primary hover:ring-primary/30',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-on-surface-variant">
              Time each player has to give a clue
            </p>
          </section>
        </div>

        <footer className="flex flex-col gap-5 border-t border-outline-variant/10 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-on-surface-variant">
              Minimum {minPlayersToStart} players required to start. Room capacity is{' '}
              {MAX_PLAYERS_PER_ROOM}.
            </p>
            {validationError || error ? (
              <p className="pt-2 text-sm font-medium text-error">
                {validationError ?? error}
              </p>
            ) : null}
          </div>
          <Button className="h-16 w-full text-base sm:w-auto sm:min-w-80" disabled={isCreating}>
            {isCreating ? 'Creating Session...' : 'Start Session'}
            <span className="material-symbols-outlined">bolt</span>
          </Button>
        </footer>
      </form>
    </PageShell>
  )
}
