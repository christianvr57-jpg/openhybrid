import { useState, type FormEvent } from 'react'
import { PlanInputError } from '../../engine/generate'
import type { IsoDate, LoggedSession, Plan, Session, Week } from '../../engine/model'
import { dateInWeek, logId, weekOf } from '../../engine/schedule'
import type { MessageKey } from '../../i18n/es.ts'
import { useI18n } from '../../i18n/index.tsx'
import { formatDate, formatDistance } from '../format'
import { LogForm } from '../log/LogForm'
import { SessionCard } from '../session/SessionCard'

const PRINCIPLES = [
  'principle.periodization',
  'principle.volume',
  'principle.deload',
  'principle.intensity',
  'principle.hardDays',
] as const

function WeekDetails({
  week,
  planId,
  isCurrent,
  today,
  logs,
  onLog,
}: {
  week: Week
  planId: string | undefined
  isCurrent: boolean
  today: IsoDate
  logs: LoggedSession[]
  onLog: (log: LoggedSession, session: Session) => void
}) {
  const { locale, t } = useI18n()
  const title = week.isPartial ? t('plan.partialWeek') : t('plan.week', { number: week.number })
  const labels = [
    t(`phase.${week.phase}`),
    formatDistance(week.runMeters, locale),
    ...(week.isDeload ? [t('plan.deload')] : []),
    ...(isCurrent ? [t('plan.current')] : []),
  ]

  return (
    <details className="week" open={isCurrent}>
      <summary>
        <strong>{title}</strong> <span className="meta">{labels.join(' · ')}</span>
      </summary>
      {week.sessions.map((session, position) => {
        const date = dateInWeek(week, session.weekday)
        const index = week.sessions
          .slice(0, position)
          .filter((item) => item.weekday === session.weekday).length
        return (
          <div key={position}>
            <p className="day">{formatDate(date, locale)}</p>
            <SessionCard session={session} />
            {date <= today && (
              <LogForm
                session={session}
                date={date}
                id={logId(planId, date, index)}
                log={logs.find((item) => item.id === logId(planId, date, index))}
                onSave={(log) => onLog(log, session)}
              />
            )}
          </div>
        )
      })}
    </details>
  )
}

function DateForm({
  plan,
  today,
  onChangeDate,
}: {
  plan: Plan
  today: IsoDate
  onChangeDate: (date: IsoDate) => void
}) {
  const { t } = useI18n()
  const [date, setDate] = useState(plan.goal.date ?? '')
  const [error, setError] = useState<MessageKey | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    try {
      onChangeDate(date)
      setError(null)
    } catch (caught) {
      if (!(caught instanceof PlanInputError)) {
        throw caught
      }
      setError(`error.${caught.code}`)
    }
  }

  return (
    <form className="log-entry" onSubmit={submit}>
      <label className="log-entry">
        {t('plan.update')}
        <input
          type="date"
          min={today}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <small>{t('plan.updateHelp')}</small>
      </label>
      {error !== null && (
        <p className="notice" role="alert">
          {t(error)}
        </p>
      )}
      <div className="actions">
        <button type="submit">{t('plan.updateButton')}</button>
      </div>
    </form>
  )
}

export function PlanView({
  plan,
  planId,
  today,
  logs,
  onLog,
  onChangeDate,
  onRestart,
}: {
  plan: Plan
  planId: string | undefined
  today: IsoDate
  logs: LoggedSession[]
  onLog: (log: LoggedSession, session: Session) => void
  onChangeDate: (date: IsoDate) => void
  onRestart: () => void
}) {
  const { t } = useI18n()
  const [confirming, setConfirming] = useState(false)
  const current = weekOf(plan, today)

  return (
    <section className="screen">
      <h2>{t('plan.title')}</h2>
      <p className="meta">{t(`race.${plan.goal.race}`)}</p>
      {plan.goal.date === undefined && <p className="meta">{t('plan.continuous')}</p>}

      {plan.warnings.map((warning) => (
        <p key={warning} className="notice">
          {t(`warning.${warning}`)}
        </p>
      ))}

      {plan.weeks.map((week) => (
        <WeekDetails
          key={week.number}
          week={week}
          planId={planId}
          isCurrent={week === current}
          today={today}
          logs={logs}
          onLog={onLog}
        />
      ))}

      <DateForm plan={plan} today={today} onChangeDate={onChangeDate} />

      <h2>{t('principle.title')}</h2>
      <ul>
        {PRINCIPLES.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
        {plan.goal.race === 'hyrox' && <li>{t('principle.stations')}</li>}
      </ul>
      <p className="meta">{t('principle.provisional')}</p>

      {confirming ? (
        <div className="actions">
          <button type="button" className="danger" onClick={onRestart}>
            {t('plan.restartConfirm')}
          </button>
          <button type="button" onClick={() => setConfirming(false)}>
            {t('plan.restartCancel')}
          </button>
        </div>
      ) : (
        <div className="actions">
          <button type="button" onClick={() => setConfirming(true)}>
            {t('plan.restart')}
          </button>
        </div>
      )}
    </section>
  )
}
