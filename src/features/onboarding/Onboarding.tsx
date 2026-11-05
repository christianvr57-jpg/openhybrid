import { useState, type FormEvent } from 'react'
import { generatePlan, PlanInputError } from '../../engine/generate'
import type { IsoDate, Level, Racer, StationId, Weekday } from '../../engine/model'
import type { MessageKey } from '../../i18n/es.ts'
import { useI18n } from '../../i18n/index.tsx'
import { hyroxDivisions } from '../../plans/hyrox-divisions'
import type { ActivePlan } from '../../data/index.ts'
import { emptyForm, FormError, toPlanInput, type OnboardingForm } from './form'

const WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]
const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced']
const RACERS: Racer[] = ['women', 'men']
const MARKS = [
  { meters: '5000', label: 'form.mark5k' },
  { meters: '10000', label: 'form.mark10k' },
  { meters: '21097', label: 'form.mark21k' },
] as const
const EQUIPMENT: StationId[] = hyroxDivisions.stations
  .map((station) => station.id)
  .filter((id) => id !== 'burpee_broad_jumps')

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item]
}

function errorKey(error: unknown): MessageKey {
  if (error instanceof FormError || error instanceof PlanInputError) {
    return `error.${error.code}`
  }
  throw error
}

export function Onboarding({
  today,
  onCreate,
}: {
  today: IsoDate
  onCreate: (active: ActivePlan) => void
}) {
  const { t } = useI18n()
  const [form, setForm] = useState<OnboardingForm>(emptyForm)
  const [error, setError] = useState<MessageKey | null>(null)

  const update = (changes: Partial<OnboardingForm>) => setForm({ ...form, ...changes })
  const divisions = hyroxDivisions.divisions.filter(
    (division) => form.racer !== '' && division.loadByRacer[form.racer] !== undefined,
  )

  const submit = (event: FormEvent) => {
    event.preventDefault()
    try {
      const input = toPlanInput(form, today)
      onCreate({
        athlete: input.athlete,
        startDate: input.startDate,
        plan: generatePlan(input),
      })
    } catch (caught) {
      setError(errorKey(caught))
    }
  }

  return (
    <form className="screen" onSubmit={submit}>
      <h2>{t('form.title')}</h2>
      <p>{t('form.intro')}</p>
      <p className="notice">{t('legal.health')}</p>

      <fieldset>
        <legend>{t('form.goal')}</legend>
        <label>
          {t('form.racer')}
          <select
            required
            value={form.racer}
            onChange={(event) =>
              update({ racer: event.target.value as Racer | '', divisionId: '' })
            }
          >
            <option value="">{t('form.choose')}</option>
            {RACERS.map((racer) => (
              <option key={racer} value={racer}>
                {t(`racer.${racer}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('form.division')}
          <select
            required
            disabled={form.racer === ''}
            value={form.divisionId}
            onChange={(event) => update({ divisionId: event.target.value })}
          >
            <option value="">{t('form.choose')}</option>
            {divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {t(`division.${division.id}` as MessageKey)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('form.raceDate')}
          <input
            type="date"
            min={today}
            value={form.raceDate}
            onChange={(event) => update({ raceDate: event.target.value })}
          />
          <small>{t('form.raceDateHelp')}</small>
        </label>
      </fieldset>

      <fieldset>
        <legend>{t('form.fitness')}</legend>
        <label>
          {t('form.level')}
          <select
            required
            value={form.level}
            onChange={(event) => update({ level: event.target.value as Level | '' })}
          >
            <option value="">{t('form.choose')}</option>
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`level.${level}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('form.weeklyKm')}
          <input
            required
            type="text"
            inputMode="decimal"
            pattern="[0-9]+([.,][0-9]+)?"
            value={form.weeklyKm}
            onChange={(event) => update({ weeklyKm: event.target.value })}
          />
        </label>
        <label>
          {t('form.mark')}
          <select
            value={form.markMeters}
            onChange={(event) => update({ markMeters: event.target.value })}
          >
            <option value="">{t('form.noMark')}</option>
            {MARKS.map((mark) => (
              <option key={mark.meters} value={mark.meters}>
                {t(mark.label)}
              </option>
            ))}
          </select>
          <small>{t('form.markHelp')}</small>
        </label>
        {form.markMeters !== '' && (
          <label>
            {t('form.markTime')}
            <input
              required
              type="text"
              inputMode="numeric"
              placeholder="45:00"
              value={form.markTime}
              onChange={(event) => update({ markTime: event.target.value })}
            />
          </label>
        )}
        <label>
          {t('form.hyroxTime')}
          <input
            type="text"
            inputMode="numeric"
            placeholder="1:30:00"
            value={form.hyroxTime}
            onChange={(event) => update({ hyroxTime: event.target.value })}
          />
          <small>{t('form.hyroxTimeHelp')}</small>
        </label>
      </fieldset>

      <fieldset>
        <legend>{t('form.days')}</legend>
        <div className="options">
          {WEEKDAYS.map((day) => (
            <label key={day}>
              <input
                type="checkbox"
                checked={form.days.includes(day)}
                onChange={() => update({ days: toggle(form.days, day) })}
              />
              {t(`weekday.${day}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>{t('form.fixed')}</legend>
        <p className="meta">{t('form.fixedHelp')}</p>
        {form.fixedActivities.map((activity, index) => (
          <div className="row" key={index}>
            <input
              type="text"
              aria-label={t('form.fixedName')}
              placeholder={t('form.fixedName')}
              value={activity.name}
              onChange={(event) =>
                update({
                  fixedActivities: form.fixedActivities.map((item, position) =>
                    position === index ? { ...item, name: event.target.value } : item,
                  ),
                })
              }
            />
            <select
              aria-label={t('form.fixedDay')}
              value={activity.weekday}
              onChange={(event) =>
                update({
                  fixedActivities: form.fixedActivities.map((item, position) =>
                    position === index ? { ...item, weekday: event.target.value as Weekday } : item,
                  ),
                })
              }
            >
              {WEEKDAYS.map((day) => (
                <option key={day} value={day}>
                  {t(`weekday.${day}`)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                update({
                  fixedActivities: form.fixedActivities.filter((_, position) => position !== index),
                })
              }
            >
              {t('form.remove')}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            update({
              fixedActivities: [...form.fixedActivities, { name: '', weekday: 'monday' }],
            })
          }
        >
          {t('form.addFixed')}
        </button>
      </fieldset>

      <fieldset>
        <legend>{t('form.equipment')}</legend>
        <p className="meta">{t('form.equipmentHelp')}</p>
        <div className="options">
          {EQUIPMENT.map((id) => (
            <label key={id}>
              <input
                type="checkbox"
                checked={form.equipment.includes(id)}
                onChange={() => update({ equipment: toggle(form.equipment, id) })}
              />
              {t(`station.${id}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {error !== null && (
        <p className="notice" role="alert">
          {t(error)}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="primary">
          {t('form.submit')}
        </button>
      </div>
    </form>
  )
}
