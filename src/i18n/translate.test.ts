import { describe, expect, it } from 'vitest'
import { en } from './en.ts'
import { es, type MessageKey } from './es.ts'
import { DEFAULT_LOCALE, isLocale, translate } from './translate.ts'

describe('translate', () => {
  it('uses Spanish as the default language', () => {
    expect(DEFAULT_LOCALE).toBe('es')
  })

  it('returns the text for each language', () => {
    expect(translate('es', 'language.label')).toBe('Idioma')
    expect(translate('en', 'language.label')).toBe('Language')
  })

  it('has a non-empty text for every key in both languages', () => {
    for (const key of Object.keys(es) as MessageKey[]) {
      expect(es[key]).not.toBe('')
      expect(en[key]).not.toBe('')
    }
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort())
  })

  it('recognises only supported languages', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('fr')).toBe(false)
    expect(isLocale(null)).toBe(false)
  })
})
