// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App.tsx'
import { loadActivePlan, saveActivePlan } from './data/index.ts'
import { I18nProvider } from './i18n/index.tsx'

vi.mock('./data/index.ts', () => ({
  loadActivePlan: vi.fn(),
  saveActivePlan: vi.fn(),
  clearActivePlan: vi.fn(),
}))

function renderApp() {
  return render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  )
}

function choose(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } })
}

describe('App', () => {
  beforeEach(() => {
    vi.mocked(loadActivePlan).mockResolvedValue(undefined)
    vi.mocked(saveActivePlan).mockResolvedValue()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('shows the legal and health notices in Spanish by default', async () => {
    renderApp()
    expect(await screen.findByText(/Consulta con un profesional/)).toBeTruthy()
    expect(screen.getByText(/no afiliado, respaldado ni patrocinado por HYROX/)).toBeTruthy()
    expect(document.documentElement.lang).toBe('es')
  })

  it('switches to English and remembers the choice', async () => {
    const { unmount } = renderApp()
    await screen.findByText(/Consulta con un profesional/)
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByText(/not affiliated with, endorsed by or sponsored by HYROX/)).toBeTruthy()
    expect(document.documentElement.lang).toBe('en')

    unmount()
    renderApp()
    expect(screen.getByText(/not affiliated with, endorsed by or sponsored by HYROX/)).toBeTruthy()
    await screen.findByText(/Check with a professional/)
  })

  it('creates and saves a plan from the questionnaire', async () => {
    renderApp()
    await screen.findByText(/Consulta con un profesional/)
    choose('Compito en', 'women')
    choose('Categoría', 'singles_women')
    choose('Nivel', 'intermediate')
    choose('Kilómetros', '20')
    for (const day of ['Martes', 'Jueves', 'Sábado', 'Domingo']) {
      fireEvent.click(screen.getByLabelText(day))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Crear mi plan' }))

    expect(await screen.findByRole('heading', { name: 'Hoy' })).toBeTruthy()
    expect(saveActivePlan).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Plan' }))
    expect(await screen.findByText('Semana 1')).toBeTruthy()
    expect(screen.getByText(/En qué se basa/)).toBeTruthy()
  })

  it('explains why a plan cannot be created', async () => {
    renderApp()
    await screen.findByText(/Consulta con un profesional/)
    choose('Compito en', 'men')
    choose('Categoría', 'singles_men')
    choose('Nivel', 'beginner')
    choose('Kilómetros', '10')
    fireEvent.click(screen.getByLabelText('Lunes'))
    fireEvent.click(screen.getByRole('button', { name: 'Crear mi plan' }))

    expect((await screen.findByRole('alert')).textContent).toMatch(/al menos 3 días/)
    expect(saveActivePlan).not.toHaveBeenCalled()
  })
})
