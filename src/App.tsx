import { useEffect, useState } from 'react'
import { clearActivePlan, loadActivePlan, saveActivePlan, type ActivePlan } from './data/index.ts'
import { todayIso } from './features/format'
import { Onboarding } from './features/onboarding/Onboarding'
import { PlanView } from './features/plan/PlanView'
import { Today } from './features/today/Today'
import { LOCALES, useI18n } from './i18n/index.tsx'

type Tab = 'today' | 'plan'

export function App() {
  const { locale, setLocale, t } = useI18n()
  const [active, setActive] = useState<ActivePlan | null | undefined>(undefined)
  const [storageFailed, setStorageFailed] = useState(false)
  const [tab, setTab] = useState<Tab>('today')
  const today = todayIso()

  useEffect(() => {
    let cancelled = false
    loadActivePlan()
      .then((stored) => {
        if (!cancelled) setActive(stored ?? null)
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

  const create = (next: ActivePlan) => {
    setActive(next)
    setTab('today')
    saveActivePlan(next).catch(() => setStorageFailed(true))
  }

  const restart = () => {
    setActive(null)
    clearActivePlan().catch(() => setStorageFailed(true))
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
        {active === null && <Onboarding today={today} onCreate={create} />}
        {active && (
          <>
            <nav className="tabs" aria-label={t('nav.label')}>
              {(['today', 'plan'] as const).map((option) => (
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
            {tab === 'today' ? (
              <Today plan={active.plan} today={today} />
            ) : (
              <PlanView plan={active.plan} today={today} onRestart={restart} />
            )}
          </>
        )}
      </main>

      <footer className="disclaimer">{t('legal.disclaimer')}</footer>
    </div>
  )
}
