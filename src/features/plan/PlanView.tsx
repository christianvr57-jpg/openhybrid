import { useState } from 'react'
import type { IsoDate, Plan, Week } from '../../engine/model'
import { dateInWeek, weekOf } from '../../engine/schedule'
import { useI18n } from '../../i18n/index.tsx'
import { formatDate, formatDistance } from '../format'
import { SessionCard } from '../session/SessionCard'

const PRINCIPLES = [
  'principle.periodization',
  'principle.volume',
  'principle.deload',
  'principle.intensity',
  'principle.hardDays',
  'principle.stations',
] as const

function WeekDetails({ week, isCurrent }: { week: Week; isCurrent: boolean }) {
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
      {week.sessions.map((session, index) => (
        <div key={index}>
          <p className="day">{formatDate(dateInWeek(week, session.weekday), locale)}</p>
          <SessionCard session={session} />
        </div>
      ))}
    </details>
  )
}

export function PlanView({
  plan,
  today,
  onRestart,
}: {
  plan: Plan
  today: IsoDate
  onRestart: () => void
}) {
  const { t } = useI18n()
  const [confirming, setConfirming] = useState(false)
  const current = weekOf(plan, today)

  return (
    <section className="screen">
      <h2>{t('plan.title')}</h2>
      {plan.goal.date === undefined && <p className="meta">{t('plan.continuous')}</p>}

      {plan.warnings.map((warning) => (
        <p key={warning} className="notice">
          {t(`warning.${warning}`)}
        </p>
      ))}

      {plan.weeks.map((week) => (
        <WeekDetails key={week.number} week={week} isCurrent={week === current} />
      ))}

      <h2>{t('principle.title')}</h2>
      <ul>
        {PRINCIPLES.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
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
