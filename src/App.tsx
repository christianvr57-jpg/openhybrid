import { LOCALES, useI18n } from './i18n/index.tsx'

export function App() {
  const { locale, setLocale, t } = useI18n()

  return (
    <div className="app">
      <main className="hero">
        <h1>{t('app.name')}</h1>
        <p className="tagline">{t('app.tagline')}</p>
        <p className="status">{t('app.status')}</p>

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
      </main>

      <footer className="disclaimer">{t('legal.disclaimer')}</footer>
    </div>
  )
}
