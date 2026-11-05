import { useState, type FormEvent } from 'react'
import type { IsoDate, LoggedSession, LogStatus, Session } from '../../engine/model'
import { useI18n } from '../../i18n/index.tsx'
import { formatClock } from '../format'
import { parseTime } from '../onboarding/form'

const STATUSES: LogStatus[] = ['done', 'partial', 'skipped']

export function LogForm({
  session,
  date,
  id,
  log,
  onSave,
}: {
  session: Session
  date: IsoDate
  id: string
  log: LoggedSession | undefined
  onSave: (log: LoggedSession) => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<LogStatus>(log?.status ?? 'done')
  const [time, setTime] = useState(
    log?.durationSeconds === undefined ? '' : formatClock(log.durationSeconds),
  )
  const [rpe, setRpe] = useState(log?.rpe === undefined ? '' : String(log.rpe))
  const [notes, setNotes] = useState(log?.notes ?? '')
  const [invalid, setInvalid] = useState(false)
  const isTest = session.type === 'test'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const durationSeconds = time.trim() === '' ? undefined : parseTime(time)
    if ((time.trim() !== '' || (isTest && status === 'done')) && durationSeconds === undefined) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    setOpen(false)
    onSave({
      id,
      date,
      type: session.type,
      status,
      ...(durationSeconds === undefined ? {} : { durationSeconds }),
      ...(rpe === '' ? {} : { rpe: Number(rpe) }),
      ...(notes.trim() === '' ? {} : { notes: notes.trim() }),
    })
  }

  return (
    <div className="log">
      {log !== undefined && (
        <p className="meta">{t('log.saved', { status: t(`log.status.${log.status}`) })}</p>
      )}
      <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary>{t(log === undefined ? 'log.open' : 'log.edit')}</summary>
        <form onSubmit={submit}>
          <label>
            {t('log.status')}
            <select value={status} onChange={(event) => setStatus(event.target.value as LogStatus)}>
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {t(`log.status.${option}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t(isTest ? 'log.testTime' : 'log.time')}
            <input
              type="text"
              inputMode="numeric"
              placeholder="45:00"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
            {isTest && <small>{t('log.testHelp')}</small>}
          </label>
          <label>
            {t('log.rpe')}
            <input
              type="number"
              min="1"
              max="10"
              step="1"
              value={rpe}
              onChange={(event) => setRpe(event.target.value)}
            />
          </label>
          <label>
            {t('log.notes')}
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          {invalid && (
            <p className="notice" role="alert">
              {t('log.invalidTime')}
            </p>
          )}
          <div className="actions">
            <button type="submit" className="primary">
              {t('log.save')}
            </button>
          </div>
        </form>
      </details>
    </div>
  )
}
