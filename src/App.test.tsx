// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from './App.tsx'
import { I18nProvider } from './i18n/index.tsx'

function renderApp() {
  return render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  )
}

describe('App', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('shows Spanish by default, including the legal disclaimer', () => {
    renderApp()
    expect(screen.getByText(/no afiliado, respaldado ni patrocinado por HYROX/)).toBeTruthy()
    expect(document.documentElement.lang).toBe('es')
  })

  it('switches to English and remembers the choice', () => {
    const { unmount } = renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByText(/not affiliated with, endorsed by or sponsored by HYROX/)).toBeTruthy()
    expect(document.documentElement.lang).toBe('en')

    unmount()
    renderApp()
    expect(screen.getByText(/not affiliated with, endorsed by or sponsored by HYROX/)).toBeTruthy()
  })
})
