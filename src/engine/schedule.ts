import type { IsoDate, LoggedSession, Plan, Session, Week, Weekday } from './model'

const DAY_MS = 86_400_000

const WEEKDAYS: readonly Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

function toTime(date: IsoDate): number {
  return Date.parse(`${date}T00:00:00Z`)
}

function toDate(time: number): IsoDate {
  return new Date(time).toISOString().slice(0, 10)
}

function weekdayIndex(time: number): number {
  return (new Date(time).getUTCDay() + 6) % 7
}

function mondayOf(date: IsoDate): number {
  const time = toTime(date)
  return time - weekdayIndex(time) * DAY_MS
}

/**
 * Id of a logged session. The plan id keeps a new plan from showing the logs of an
 * earlier plan on the same day. Plans from older versions have none.
 */
export function logId(planId: string | undefined, date: IsoDate, index: number): string {
  return planId === undefined ? `${date}:${index}` : `${planId}:${date}:${index}`
}

/** Calendar date of a weekday inside a plan week. */
export function dateInWeek(week: Week, weekday: Weekday): IsoDate {
  return toDate(mondayOf(week.startDate) + WEEKDAYS.indexOf(weekday) * DAY_MS)
}

/** The week that contains a date, or undefined outside the plan. */
export function weekOf(plan: Plan, date: IsoDate): Week | undefined {
  return plan.weeks.find((week) => mondayOf(week.startDate) === mondayOf(date))
}

export function sessionsOn(plan: Plan, date: IsoDate): Session[] {
  const week = weekOf(plan, date)
  const weekday = WEEKDAYS[weekdayIndex(toTime(date))]
  return week?.sessions.filter((session) => session.weekday === weekday) ?? []
}

/** First date after `date` with a session, or undefined if the plan is over. */
export function nextTrainingDate(plan: Plan, date: IsoDate): IsoDate | undefined {
  return plan.weeks
    .flatMap((week) => week.sessions.map((session) => dateInWeek(week, session.weekday)))
    .filter((sessionDate) => sessionDate > date)
    .sort()[0]
}

/** Running volume reached so far, to restart a plan from where the athlete is. */
export function reachedVolume(plan: Plan, date: IsoDate): number {
  const volumes = plan.weeks
    .filter(
      (week) =>
        !week.isDeload &&
        !week.isPartial &&
        week.phase !== 'taper' &&
        mondayOf(week.startDate) < mondayOf(date),
    )
    .map((week) => week.runMeters)
  return Math.max(0, ...volumes)
}

const FATIGUE_SESSIONS = 3
const FATIGUE_RPE = 9

/** True when the latest sessions were all missed, cut short or very hard. */
export function showsFatigue(logs: readonly LoggedSession[]): boolean {
  const latest = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, FATIGUE_SESSIONS)
  return (
    latest.length === FATIGUE_SESSIONS &&
    latest.every((log) => log.status !== 'done' || (log.rpe ?? 0) >= FATIGUE_RPE)
  )
}
