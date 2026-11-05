import type { IsoDate, LoggedSession, Plan } from '../../engine/model'
import { nextTrainingDate, sessionsOn, showsFatigue } from '../../engine/schedule'
import { useI18n } from '../../i18n/index.tsx'
import { formatDate } from '../format'
import { LogForm } from '../log/LogForm'
import { SessionCard } from '../session/SessionCard'

export function Today({
  plan,
  today,
  logs,
  onLog,
}: {
  plan: Plan
  today: IsoDate
  logs: LoggedSession[]
  onLog: (log: LoggedSession, session: ReturnType<typeof sessionsOn>[number]) => void
}) {
  const { locale, t } = useI18n()
  const sessions = sessionsOn(plan, today)
  const next = nextTrainingDate(plan, today)

  return (
    <section className="screen">
      <h2>{t('today.title')}</h2>
      <p className="meta">{formatDate(today, locale)}</p>

      {showsFatigue(logs) && <p className="notice">{t('today.fatigue')}</p>}

      {sessions.map((session, index) => (
        <div key={index}>
          <SessionCard session={session} />
          <LogForm
            session={session}
            date={today}
            index={index}
            log={logs.find((item) => item.id === `${today}:${index}`)}
            onSave={(log) => onLog(log, session)}
          />
        </div>
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
