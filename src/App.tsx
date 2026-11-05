import { useEffect, useState } from 'react'
import {
  clearActivePlan,
  deleteLog,
  loadActivePlan,
  loadLogs,
  restoreBackup,
  saveActivePlan,
  saveLog,
  type ActivePlan,
  type Backup,
} from './data/index.ts'
import { generatePlan } from './engine/generate'
import type { IsoDate, LoggedSession, Session } from './engine/model'
import { applyMark } from './engine/paces'
import { reachedVolume } from './engine/schedule'
import { todayIso } from './features/format'
import { History } from './features/history/History'
import { Onboarding } from './features/onboarding/Onboarding'
import { PlanView } from './features/plan/PlanView'
import { Today } from './features/today/Today'
import { LOCALES, useI18n } from './i18n/index.tsx'

const TABS = ['today', 'plan', 'history'] as const
type Tab = (typeof TABS)[number]

export function App() {
  const { locale, setLocale, t } = useI18n()
  const [active, setActive] = useState<ActivePlan | null | undefined>(undefined)
  const [logs, setLogs] = useState<LoggedSession[]>([])
  const [storageFailed, setStorageFailed] = useState(false)
  const [tab, setTab] = useState<Tab>('today')
  const today = todayIso()

  useEffect(() => {
    let cancelled = false
    Promise.all([loadActivePlan(), loadLogs()])
      .then(([stored, storedLogs]) => {
        if (!cancelled) {
          setActive(stored ?? null)
          setLogs(storedLogs)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStorageFailed(true)
          setActive(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const keep = (write: Promise<void>) => {
    write.catch(() => setStorageFailed(true))
  }

  const updatePlan = (next: ActivePlan) => {
    setActive(next)
    keep(saveActivePlan(next))
  }

  const create = (next: ActivePlan) => {
    updatePlan(next)
    setTab('today')
  }

  const restart = () => {
    setActive(null)
    keep(clearActivePlan())
  }

  const logSession = (log: LoggedSession, session: Session) => {
    setLogs([...logs.filter((item) => item.id !== log.id), log])
    keep(saveLog(log))

    const testBlock = session.blocks.find((block) => block.kind === 'run')
    if (
      active &&
      session.type === 'test' &&
      log.status === 'done' &&
      log.durationSeconds !== undefined &&
      testBlock?.kind === 'run'
    ) {
      const mark = { distanceMeters: testBlock.meters, timeSeconds: log.durationSeconds }
      updatePlan({
        ...active,
        athlete: { ...active.athlete, mark },
        plan: applyMark(active.plan, mark),
      })
    }
  }

  const removeLog = (id: string) => {
    setLogs(logs.filter((item) => item.id !== id))
    keep(deleteLog(id))
  }

  const restore = (backup: Backup) => {
    setActive(backup.active)
    setLogs(backup.logs)
    keep(restoreBackup(backup))
  }

  /** Recalculates the plan from today. Throws PlanInputError when it is not possible. */
  const changeDate = (date: IsoDate) => {
    if (!active) {
      return
    }
    const goal = { ...active.plan.goal }
    delete goal.date
    const athlete = {
      ...active.athlete,
      weeklyRunMeters: Math.max(active.athlete.weeklyRunMeters, reachedVolume(active.plan, today)),
    }
    const plan = generatePlan({
      athlete,
      goal: date === '' ? goal : { ...goal, date },
      startDate: today,
    })
    updatePlan({ athlete, startDate: today, plan })
  }

  return (
    <div className="app">
      <header className="top">
        <h1>{t('app.name')}</h1>
        <div className="language" role="group" aria-label={t('language.label')}>
          {LOCALES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === locale}
              onClick={() => setLocale(option)}
            >
              {t(`language.${option}`)}
            </button>
          ))}
        </div>
      </header>

      {storageFailed && <p className="notice">{t('storage.failed')}</p>}

      <main className="content">
        {active !== undefined && (
          <>
            {active !== null && (
              <nav className="tabs" aria-label={t('nav.label')}>
                {TABS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={option === tab}
                    onClick={() => setTab(option)}
                  >
                    {t(`nav.${option}`)}
                  </button>
                ))}
              </nav>
            )}
            {active === null && <Onboarding today={today} onCreate={create} />}
            {active !== null && tab === 'today' && (
              <Today plan={active.plan} today={today} logs={logs} onLog={logSession} />
            )}
            {active !== null && tab === 'plan' && (
              <PlanView
                plan={active.plan}
                today={today}
                logs={logs}
                onLog={logSession}
                onChangeDate={changeDate}
                onRestart={restart}
              />
            )}
            {(active === null || tab === 'history') && (
              <History
                logs={logs}
                active={active}
                today={today}
                onDelete={removeLog}
                onImport={restore}
              />
            )}
          </>
        )}
      </main>

      <footer className="disclaimer">{t('legal.disclaimer')}</footer>
    </div>
  )
}
