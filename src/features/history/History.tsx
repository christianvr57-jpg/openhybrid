import { useState, type ChangeEvent } from 'react'
import { parseBackup, serializeBackup, type ActivePlan, type Backup } from '../../data/backup'
import type { LoggedSession, SessionType, Simulation } from '../../engine/model'
import { useI18n } from '../../i18n/index.tsx'
import { formatDate } from '../format'

function downloadBackup(text: string, date: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `openhybrid-${date}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export function History({
  logs,
  simulations,
  active,
  today,
  onDelete,
  onImport,
}: {
  logs: LoggedSession[]
  simulations: Simulation[]
  active: ActivePlan | null
  today: string
  onDelete: (id: string) => void
  onImport: (backup: Backup) => void
}) {
  const { locale, t } = useI18n()
  const [result, setResult] = useState<'backup.imported' | 'backup.invalid' | null>(null)
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))
  const done = logs.filter((log) => log.status === 'done').length

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (file === undefined) {
      return
    }
    const backup = parseBackup(await file.text())
    input.value = ''
    setResult(backup === undefined ? 'backup.invalid' : 'backup.imported')
    if (backup !== undefined) {
      onImport(backup)
    }
  }

  return (
    <section className="screen">
      <h2>{t('history.title')}</h2>
      {logs.length === 0 ? (
        <p className="meta">{t('history.empty')}</p>
      ) : (
        <p className="meta">{t('history.summary', { done, total: logs.length })}</p>
      )}

      {sorted.map((log) => (
        <article className="card log-entry" key={log.id}>
          <h3>{t(`session.${log.type as SessionType}`)}</h3>
          <p className="meta">
            {[
              formatDate(log.date, locale),
              t(`log.status.${log.status}`),
              ...(log.durationSeconds === undefined
                ? []
                : [t('session.minutes', { minutes: Math.round(log.durationSeconds / 60) })]),
              ...(log.rpe === undefined ? [] : [`RPE ${log.rpe}`]),
            ].join(' · ')}
          </p>
          {log.notes !== undefined && <p>{log.notes}</p>}
          <div className="actions">
            <button type="button" onClick={() => onDelete(log.id)}>
              {t('history.delete')}
            </button>
          </div>
        </article>
      ))}

      <h2>{t('backup.title')}</h2>
      <p className="meta">{t('backup.help')}</p>
      <div className="actions">
        <button
          type="button"
          onClick={() => downloadBackup(serializeBackup({ active, logs, simulations }), today)}
        >
          {t('backup.export')}
        </button>
        <label className="file">
          {t('backup.import')}
          <input type="file" accept="application/json,.json" onChange={importFile} />
        </label>
      </div>
      {result !== null && (
        <p className="notice" role="status">
          {t(result)}
        </p>
      )}
    </section>
  )
}
