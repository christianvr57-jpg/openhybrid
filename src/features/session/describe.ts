import type { Block } from '../../engine/model'
import type { MessageKey } from '../../i18n/es.ts'
import type { Locale } from '../../i18n/index.tsx'
import type { MessageParams } from '../../i18n/translate.ts'
import { formatDistance, formatPaceRange } from '../format'

type Translate = (key: MessageKey, params?: MessageParams) => string

function describeRecovery(block: Extract<Block, { kind: 'run' }>, t: Translate, locale: Locale) {
  if (block.recovery === undefined) {
    return []
  }
  const amount =
    'meters' in block.recovery
      ? formatDistance(block.recovery.meters, locale)
      : `${block.recovery.seconds} s`
  return [t('block.recovery', { amount })]
}

/** One line of text for a block of a session. */
export function describeBlock(block: Block, t: Translate, locale: Locale): string {
  switch (block.kind) {
    case 'warmup':
      return t('block.warmup', { minutes: Math.round(block.seconds / 60) })
    case 'cooldown':
      return t('block.cooldown', { minutes: Math.round(block.seconds / 60) })
    case 'run': {
      const distance = formatDistance(block.meters, locale)
      return [
        block.repeats > 1 ? `${block.repeats} × ${distance}` : distance,
        block.zone.toUpperCase(),
        block.pace === undefined ? t('block.byFeel') : formatPaceRange(block.pace),
        ...describeRecovery(block, t, locale),
      ].join(' · ')
    }
    case 'station': {
      const station = t(`station.${block.station}`)
      const name =
        block.substitute === undefined
          ? station
          : t('block.substitute', {
              exercise: t(`exercise.${block.substitute}` as MessageKey),
              station,
            })
      const amount =
        block.meters === undefined
          ? t('block.reps', { reps: block.reps ?? 0 })
          : formatDistance(block.meters, locale)
      const load =
        block.loadKg === undefined
          ? []
          : [
              block.station === 'farmers_carry'
                ? t('block.loadPerHand', { kg: block.loadKg })
                : `${block.loadKg} kg`,
            ]
      return [name, amount, ...load].join(' · ')
    }
    case 'strength':
      return [
        t(`exercise.${block.exercise}` as MessageKey),
        `${block.sets} × ${block.reps}`,
        `RIR ${block.rir}`,
      ].join(' · ')
  }
}
