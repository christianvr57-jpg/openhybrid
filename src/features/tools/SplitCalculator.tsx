import { useState } from 'react'
import { calculateSplits } from '../../engine/splits'
import { useI18n } from '../../i18n/index.tsx'
import { formatClock, formatPace } from '../format'
import { parseTime } from '../onboarding/form'

export function SplitCalculator({ initialSeconds }: { initialSeconds: number | undefined }) {
  const { t } = useI18n()
  const [time, setTime] = useState(initialSeconds === undefined ? '' : formatClock(initialSeconds))
  const target = parseTime(time)
  const splits = target === undefined ? undefined : calculateSplits(target)

  return (
    <section className="screen">
      <h2>{t('calc.title')}</h2>
      <p className="meta">{t('calc.help')}</p>
      <label className="log-entry">
        {t('calc.target')}
        <input
          type="text"
          inputMode="numeric"
          placeholder="1:30:00"
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />
      </label>

      {splits !== undefined && (
        <>
          <table className="splits">
            <tbody>
              <tr>
                <th scope="row">{t('calc.run')}</th>
                <td>{formatPace(splits.runSecondsPerKm)} /km</td>
              </tr>
              {splits.stations.map(({ station, seconds }) => (
                <tr key={station}>
                  <th scope="row">{t(`station.${station}`)}</th>
                  <td>{formatClock(seconds)}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">{t('calc.roxzone')}</th>
                <td>{formatClock(splits.roxzoneSeconds)}</td>
              </tr>
            </tbody>
          </table>
          <p className="meta">{t('calc.provisional')}</p>
        </>
      )}
    </section>
  )
}
