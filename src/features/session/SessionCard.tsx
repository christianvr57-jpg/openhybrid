import type { Session } from '../../engine/model'
import { useI18n } from '../../i18n/index.tsx'
import { describeBlock } from './describe'

export function SessionCard({ session }: { session: Session }) {
  const { locale, t } = useI18n()
  const minutes = Math.round(session.estimatedSeconds / 60)

  return (
    <article className="card">
      <h3>{t(`session.${session.type}`)}</h3>
      <p className="meta">
        {t('session.minutes', { minutes })}
        {session.targetRpe === undefined ? '' : ` · RPE ${session.targetRpe}`}
      </p>
      <ul>
        {session.blocks.map((block, index) => (
          <li key={index}>{describeBlock(block, t, locale)}</li>
        ))}
      </ul>
    </article>
  )
}
