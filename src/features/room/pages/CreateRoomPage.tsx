import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { MAX_PLAYERS_PER_ROOM } from '../../../../shared/gameSettings'
import { Button } from '../../../shared/components/Button'
import { PageShell } from '../../../shared/layouts/PageShell'
import { cn } from '../../../shared/lib/cn'
import { useCreateRoom } from '../hooks/useCreateRoom'

const timerOptions = [5, 8, 10]
const discussionTimerOptions = [
  { label: '1 min', value: 60_000 },
  { label: '2 min', value: 120_000 },
  { label: '3 min', value: 180_000 },
] as const
const minPlayersToStart = 4

type RuleSetting = {
  id: 'showSpyWord' | 'anonymousVoting'
  label: string
  description: string
  icon: string
  enabled: boolean
}

const initialRules: RuleSetting[] = [
  {
    id: 'showSpyWord',
    label: 'Show Word to Spy',
    description: 'Infiltrators receive the clue with extra context.',
    icon: 'visibility',
    enabled: true,
  },
  {
    id: 'anonymousVoting',
    label: 'Anonymous Voting',
    description: 'Voter identities stay hidden until results.',
    icon: 'fingerprint',
    enabled: false,
  },
]

function getRecommendedSpyCount(playerCount: number) {
  if (playerCount >= 10) {
    return 3
  }

  if (playerCount >= 7) {
    return 2
  }

  return 1
}

export function CreateRoomPage() {
  const navigate = useNavigate()
  const { createRoom, isCreating, error } = useCreateRoom()
  const [playerName, setPlayerName] = useState('')
  const [spyCount, setSpyCount] = useState(2)
  const [timerMinutes, setTimerMinutes] = useState(8)
  const [expectedPlayers, setExpectedPlayers] = useState(8)
  const [rules, setRules] = useState(initialRules)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [discussionTurnDurationMs, setDiscussionTurnDurationMs] = useState<60000 | 120000 | 180000>(60_000)

  const recommendedSpyCount = getRecommendedSpyCount(expectedPlayers)
  const timerProgress = timerMinutes === 5 ? '40%' : timerMinutes === 8 ? '66%' : '90%'

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

  function adjustSpyCount(delta: number) {
    setSpyCount((current) => Math.max(1, Math.min(5, current + delta)))
  }

  function toggleRule(ruleId: RuleSetting['id']) {
    setRules((currentRules) =>
      currentRules.map((rule) =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule,
      ),
    )
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
            <div className="mt-6 grid gap-4">
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Expected Players
                </span>
                <input
                  type="number"
                  min={minPlayersToStart}
                  max={MAX_PLAYERS_PER_ROOM}
                  value={expectedPlayers}
                  onChange={(event) => setExpectedPlayers(Number(event.target.value))}
                  className="w-full rounded-[1rem] border-0 bg-surface-container-lowest px-4 py-4 text-on-surface outline-none ring-1 ring-outline-variant/10 transition focus:ring-2 focus:ring-tertiary"
                />
              </label>
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-surface-container/70 p-5 ring-1 ring-outline-variant/10 backdrop-blur-xl sm:p-8 lg:col-span-4">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-tertiary">
              Threat Level
            </p>
            <h2 className="mt-2 font-headline text-2xl font-black">Spy Count</h2>
            <div className="my-8 flex items-center justify-center gap-6">
              <button
                className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-highest text-on-surface transition hover:text-error active:scale-95"
                type="button"
                onClick={() => adjustSpyCount(-1)}
                aria-label="Decrease spy count"
              >
                <span className="material-symbols-outlined text-3xl">remove</span>
              </button>
              <span className="min-w-14 text-center font-headline text-6xl font-black">
                {spyCount}
              </span>
              <button
                className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-highest text-on-surface transition hover:text-tertiary active:scale-95"
                type="button"
                onClick={() => adjustSpyCount(1)}
                aria-label="Increase spy count"
              >
                <span className="material-symbols-outlined text-3xl">add</span>
              </button>
            </div>
            <p className="text-center text-sm text-on-surface-variant">
              Recommended: {recommendedSpyCount} for {expectedPlayers} players
            </p>
          </section>

          <section className="rounded-[1.5rem] bg-surface-container/70 p-5 ring-1 ring-outline-variant/10 backdrop-blur-xl sm:p-8 lg:col-span-6">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-tertiary">
              Mission Duration
            </p>
            <h2 className="mt-2 font-headline text-2xl font-black">Intel Window</h2>
            <div className="my-6 grid grid-cols-3 gap-3">
              {timerOptions.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setTimerMinutes(minutes)}
                  className={cn(
                    'rounded-[1rem] px-4 py-4 font-headline font-black transition ring-1',
                    timerMinutes === minutes
                      ? 'bg-primary-container text-on-primary-container shadow-[0_10px_30px_rgba(161,142,255,0.22)] ring-primary/20'
                      : 'bg-surface-container-highest text-on-surface-variant ring-transparent hover:text-primary hover:ring-primary/30',
                  )}
                >
                  {minutes}m
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                <span>Short</span>
                <span>Long</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-container-highest">
                <div
                  className="relative h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                  style={{ width: timerProgress }}
                >
                  <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_#fff]" />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-surface-container/70 p-5 ring-1 ring-outline-variant/10 backdrop-blur-xl sm:p-8 lg:col-span-6">
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

          <section className="rounded-[1.5rem] bg-surface-container/70 p-5 ring-1 ring-outline-variant/10 backdrop-blur-xl sm:p-8 lg:col-span-7">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-tertiary">
              Advanced Directives
            </p>
            <h2 className="mt-2 font-headline text-2xl font-black">Pro Rules</h2>
            <div className="mt-6 space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between gap-4 rounded-[1rem] bg-surface-container-lowest p-4 ring-1 ring-outline-variant/10"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="material-symbols-outlined shrink-0 text-2xl text-primary">
                      {rule.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-on-surface">{rule.label}</p>
                      <p className="text-sm text-on-surface-variant">{rule.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rule.enabled}
                    aria-label={rule.label}
                    onClick={() => toggleRule(rule.id)}
                    className={cn(
                      'relative h-7 w-14 shrink-0 rounded-full transition',
                      rule.enabled ? 'bg-tertiary' : 'bg-surface-container-highest',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute left-1 top-1 h-5 w-5 rounded-full transition',
                        rule.enabled
                          ? 'translate-x-7 bg-surface'
                          : 'translate-x-0 bg-on-surface-variant',
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="flex flex-col gap-5 border-t border-outline-variant/10 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="font-headline text-lg font-black text-on-surface">
              {expectedPlayers} Players Planned
            </p>
            <p className="text-sm text-on-surface-variant">
              Minimum {minPlayersToStart} required to start. Room capacity is{' '}
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
