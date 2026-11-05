import { useEffect, useState } from 'react'
import type { IsoDate, Simulation, StationId } from '../../engine/model'
import {
  beatenRecords,
  BEST_RUN,
  bestTimes,
  SIMULATION_SEGMENTS,
  splitsFromLaps,
} from '../../engine/simulation'
import { useI18n } from '../../i18n/index.tsx'
import { formatClock, formatDate } from '../format'

const STORAGE_KEY = 'openhybrid.simulation'

interface RunningTimer {
  startedAt: number
  laps: number[]
}

// A phone can close the app in the middle of a session, so progress is kept here.
function readRunning(): RunningTimer | null {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    const candidate = stored as RunningTimer | null
    return typeof candidate?.startedAt === 'number' && Array.isArray(candidate.laps)
      ? candidate
      : null
  } catch {
    return null
  }
}

function storeRunning(running: RunningTimer | null): void {
  try {
    if (running === null) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(running))
    }
  } catch {
    // The timer still works, but it won't survive closing the app.
  }
}

function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) {
      return
    }
    let released = false
    let sentinel: WakeLockSentinel | undefined
    navigator.wakeLock
      .request('screen')
      .then((lock) => {
        sentinel = lock
        if (released) {
          void lock.release()
        }
      })
      .catch(() => {
        // Not allowed right now: the screen may turn off, but the time stays correct.
      })
    return () => {
      released = true
      void sentinel?.release()
    }
  }, [active])
}

export function SimulationTimer({
  simulations,
  divisionId,
  today,
  onSave,
  onDelete,
}: {
  simulations: Simulation[]
  divisionId: string | undefined
  today: IsoDate
  onSave: (simulation: Simulation) => void
  onDelete: (id: string) => void
}) {
  const { locale, t } = useI18n()
  const [running, setRunningState] = useState<RunningTimer | null>(readRunning)
  const [now, setNow] = useState(() => Date.now())
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [result, setResult] = useState<{ simulation: Simulation; beaten: string[] } | null>(null)

  useWakeLock(running !== null)

  useEffect(() => {
    if (running === null) {
      return
    }
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [running])

  const setRunning = (next: RunningTimer | null) => {
    setRunningState(next)
    storeRunning(next)
  }

  const segmentName = (segment: string): string => {
    if (segment === BEST_RUN) {
      return t('sim.bestRun')
    }
    return segment.startsWith('run_')
      ? t('sim.run', { number: segment.slice('run_'.length) })
      : t(`station.${segment as StationId}`)
  }

  const finish = (timer: RunningTimer) => {
    const splits = splitsFromLaps(timer.startedAt, timer.laps)
    const simulation: Simulation = {
      id: String(timer.startedAt),
      date: today,
      ...(divisionId === undefined ? {} : { divisionId }),
      splits,
      totalSeconds: splits.reduce((total, item) => total + item.seconds, 0),
    }
    setRunning(null)
    setConfirmingCancel(false)
    setResult({ simulation, beaten: beatenRecords(simulation, simulations) })
    onSave(simulation)
  }

  const nextSegment = () => {
    if (running === null) {
      return
    }
    const next = { ...running, laps: [...running.laps, Date.now()] }
    if (next.laps.length === SIMULATION_SEGMENTS.length) {
      finish(next)
    } else {
      setRunning(next)
    }
  }

  if (running !== null) {
    const segment = SIMULATION_SEGMENTS[running.laps.length] ?? ''
    const isLast = running.laps.length === SIMULATION_SEGMENTS.length - 1
    const lastLap = running.laps.at(-1) ?? running.startedAt
    const elapsed = (from: number) => formatClock(Math.max(0, Math.floor((now - from) / 1000)))

    return (
      <section className="screen">
        <h2>{t('sim.title')}</h2>
        <p className="clock" role="timer">
          {elapsed(running.startedAt)}
        </p>
        <article className="card">
          <p className="meta">
            {t('sim.progress', {
              current: running.laps.length + 1,
              total: SIMULATION_SEGMENTS.length,
            })}
          </p>
          <h3>{segmentName(segment)}</h3>
          <p className="lap">{elapsed(lastLap)}</p>
        </article>
        <div className="actions">
          <button type="button" className="primary" onClick={nextSegment}>
            {t(isLast ? 'sim.finish' : 'sim.next')}
          </button>
        </div>
        <div className="actions">
          {running.laps.length > 0 && (
            <button type="button" onClick={() => finish(running)}>
              {t('sim.stopHere')}
            </button>
          )}
          {confirmingCancel ? (
            <button
              type="button"
              className="danger"
              onClick={() => {
                setRunning(null)
                setConfirmingCancel(false)
              }}
            >
              {t('sim.cancelConfirm')}
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmingCancel(true)}>
              {t('sim.cancel')}
            </button>
          )}
        </div>
      </section>
    )
  }

  const records = [...bestTimes(simulations, divisionId)]
  const sorted = [...simulations].sort((a, b) => b.id.localeCompare(a.id))

  return (
    <section className="screen">
      <h2>{t('sim.title')}</h2>
      <p className="meta">{t('sim.help')}</p>

      {result !== null && (
        <>
          <article className="card">
            <h3>{t('sim.total', { time: formatClock(result.simulation.totalSeconds) })}</h3>
            {result.beaten.length > 0 && (
              <p>{t('sim.beaten', { records: result.beaten.map(segmentName).join(', ') })}</p>
            )}
          </article>
          <table className="splits">
            <tbody>
              {result.simulation.splits.map(({ segment, seconds }) => (
                <tr key={segment}>
                  <th scope="row">{segmentName(segment)}</th>
                  <td>{formatClock(seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="actions">
        <button
          type="button"
          className="primary"
          onClick={() => {
            setResult(null)
            setNow(Date.now())
            setRunning({ startedAt: Date.now(), laps: [] })
          }}
        >
          {t('sim.start')}
        </button>
      </div>

      {records.length > 0 && (
        <>
          <h2>{t('sim.records')}</h2>
          <table className="splits">
            <tbody>
              {records.map(([segment, seconds]) => (
                <tr key={segment}>
                  <th scope="row">{segmentName(segment)}</th>
                  <td>{formatClock(seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {sorted.length > 0 && <h2>{t('sim.past')}</h2>}
      {sorted.map((simulation) => (
        <article className="card log-entry" key={simulation.id}>
          <h3>{formatClock(simulation.totalSeconds)}</h3>
          <p className="meta">
            {formatDate(simulation.date, locale)} ·{' '}
            {t('sim.segments', { count: simulation.splits.length })}
          </p>
          <div className="actions">
            <button type="button" onClick={() => onDelete(simulation.id)}>
              {t('history.delete')}
            </button>
          </div>
        </article>
      ))}
    </section>
  )
}
