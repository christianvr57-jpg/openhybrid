import { en } from './en.ts'
import { es, type MessageKey, type Messages } from './es.ts'

export const LOCALES = ['es', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'es'

export type MessageParams = Record<string, string | number>

const messages: Record<Locale, Messages> = { es, en }

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale === value)
}

/** Returns the text for a key, replacing `{name}` placeholders with `params`. */
export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
  return messages[locale][key].replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    String(params?.[name] ?? placeholder),
  )
}
