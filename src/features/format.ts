import type { IsoDate, PaceRange } from '../engine/model'
import type { Locale } from '../i18n/index.tsx'

/** Seconds per kilometre as m:ss. */
export function formatPace(secondsPerKm: number): string {
  const total = Math.round(secondsPerKm)
  const seconds = String(total % 60).padStart(2, '0')
  return `${Math.floor(total / 60)}:${seconds}`
}

/** Seconds as m:ss, or h:mm:ss from one hour. */
export function formatClock(totalSeconds: number): string {
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  const minutes = Math.floor(totalSeconds / 60)
  return minutes < 60
    ? `${minutes}:${seconds}`
    : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${seconds}`
}

export function formatPaceRange(pace: PaceRange): string {
  return `${formatPace(pace.fastest)}–${formatPace(pace.slowest)} /km`
}

export function formatDistance(meters: number, locale: Locale): string {
  if (meters < 1000) {
    return `${meters} m`
  }
  const km = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(meters / 1000)
  return `${km} km`
}

export function formatDate(date: IsoDate, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(Date.parse(`${date}T00:00:00Z`))
}

/** Today in the device time zone, as an ISO date. */
export function todayIso(now = new Date()): IsoDate {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
