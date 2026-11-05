import type { IsoDate, Plan } from '../../engine/model'
import { nextTrainingDate, sessionsOn } from '../../engine/schedule'
import { useI18n } from '../../i18n/index.tsx'
import { formatDate } from '../format'
import { SessionCard } from '../session/SessionCard'

export function Today({ plan, today }: { plan: Plan; today: IsoDate }) {
  const { locale, t } = useI18n()
  const sessions = sessionsOn(plan, today)
  const next = nextTrainingDate(plan, today)

  return (
    <section className="screen">
      <h2>{t('today.title')}</h2>
      <p className="meta">{formatDate(today, locale)}</p>

      {sessions.map((session, index) => (
        <SessionCard key={index} session={session} />
      ))}

      {sessions.length === 0 && (
        <article className="card">
          <h3>{t('today.rest')}</h3>
          <p>
            {next === undefined
              ? t('today.planOver')
              : t('today.next', { date: formatDate(next, locale) })}
          </p>
        </article>
      )}
    </section>
  )
}
