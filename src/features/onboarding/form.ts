import type { PlanInput } from '../../engine/generate'
import type { IsoDate, Level, RaceType, Racer, StationId, Weekday } from '../../engine/model'

export interface FixedActivityField {
  name: string
  weekday: Weekday
}

export interface OnboardingForm {
  race: RaceType
  racer: Racer | ''
  divisionId: string
  raceDate: string
  level: Level | ''
  markMeters: string
  markTime: string
  hyroxTime: string
  weeklyKm: string
  days: Weekday[]
  fixedActivities: FixedActivityField[]
  equipment: StationId[]
}

export const emptyForm: OnboardingForm = {
  race: 'hyrox',
  racer: '',
  divisionId: '',
  raceDate: '',
  level: '',
  markMeters: '',
  markTime: '',
  hyroxTime: '',
  weeklyKm: '',
  days: [],
  fixedActivities: [],
  equipment: [],
}

export type FormErrorCode = 'incomplete' | 'invalid_mark_time' | 'invalid_hyrox_time'

export class FormError extends Error {
  readonly code: FormErrorCode

  constructor(code: FormErrorCode) {
    super(code)
    this.name = 'FormError'
    this.code = code
  }
}

/** Parses m:ss or h:mm:ss into seconds. Returns undefined when it is not a valid time. */
export function parseTime(text: string): number | undefined {
  const match = /^(?:(\d+):)?(\d{1,3}):(\d{2})$/.exec(text.trim())
  if (match === null) {
    return undefined
  }
  const [, hours = '0', minutes = '0', seconds = '0'] = match
  if (Number(seconds) >= 60 || (match[1] !== undefined && Number(minutes) >= 60)) {
    return undefined
  }
  const total = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)
  return total > 0 ? total : undefined
}

function requiredTime(text: string, code: FormErrorCode): number {
  const seconds = parseTime(text)
  if (seconds === undefined) {
    throw new FormError(code)
  }
  return seconds
}

/** Turns the questionnaire answers into the input of the plan generator. */
export function toPlanInput(form: OnboardingForm, today: IsoDate): PlanInput {
  const weeklyKm = Number(form.weeklyKm.replace(',', '.'))
  const isHyrox = form.race === 'hyrox'
  if (
    form.level === '' ||
    form.weeklyKm === '' ||
    (isHyrox && (form.racer === '' || form.divisionId === ''))
  ) {
    throw new FormError('incomplete')
  }

  const mark =
    form.markMeters === ''
      ? {}
      : {
          mark: {
            distanceMeters: Number(form.markMeters),
            timeSeconds: requiredTime(form.markTime, 'invalid_mark_time'),
          },
        }
  const hyroxTime =
    !isHyrox || form.hyroxTime.trim() === ''
      ? {}
      : { hyroxTimeSeconds: requiredTime(form.hyroxTime, 'invalid_hyrox_time') }

  return {
    athlete: {
      level: form.level,
      ...(isHyrox && form.racer !== '' ? { racer: form.racer } : {}),
      ...mark,
      ...hyroxTime,
      weeklyRunMeters: weeklyKm * 1000,
      availableDays: form.days,
      fixedActivities: form.fixedActivities
        .map((activity) => ({ ...activity, name: activity.name.trim() }))
        .filter((activity) => activity.name !== ''),
      equipment: isHyrox ? form.equipment : [],
    },
    goal: {
      race: form.race,
      ...(isHyrox ? { divisionId: form.divisionId } : {}),
      ...(form.raceDate === '' ? {} : { date: form.raceDate }),
    },
    startDate: today,
  }
}
