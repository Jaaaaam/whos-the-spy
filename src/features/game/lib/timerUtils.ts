export function getSecondsRemaining(endsAt: number, now: number) {
  return Math.max(0, Math.ceil((endsAt - now) / 1_000))
}

export function formatSeconds(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function getTimerProgress(endsAt: number, durationMs: number, now: number) {
  if (durationMs <= 0) return 0
  const remainingMs = endsAt - now
  return Math.max(0, Math.min(100, (remainingMs / durationMs) * 100))
}
