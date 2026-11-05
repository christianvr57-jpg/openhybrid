import type { IsoDate, Plan, Session, Week, Weekday } from './model'

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
