import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReadingPractice, RequestFlow } from './ReadingActivities'
import { CodeSample } from './CodeSample'
import pilot from '../../../../backend/src/main/resources/lessons/http-401-and-403/4/manifest.json'

describe('reading activities', () => {
  it('reveals reasoning only on request and starts fresh on remount', () => {
    const practice = pilot.sections[0].practice!
    const view = render(<ReadingPractice practice={practice}/>)
    const reveal = screen.getByRole('button', { name: 'Reveal reasoning' })
    expect(reveal).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: practice.choices[0].label }))
    expect(screen.queryByText(practice.choices[0].reason)).toBeNull()
    fireEvent.click(reveal)
    expect(screen.getByText(practice.choices[0].reason)).toBeVisible()
    fireEvent.click(screen.getByRole('radio', { name: practice.choices[1].label }))
    expect(screen.queryByText(practice.choices[0].reason)).toBeNull()
    view.unmount()
    render(<ReadingPractice practice={practice}/>)
    expect(screen.getByRole('button', { name: 'Reveal reasoning' })).toBeDisabled()
  })

  it('keeps the failed Basic path separate from both translated denials', () => {
    render(<RequestFlow cases={pilot.cases} request={pilot.request}/>)
    fireEvent.click(screen.getByText('Text walkthrough'))
    for (const scenario of pilot.cases) {
      fireEvent.click(screen.getByRole('radio', { name: scenario.label }))
      const route = within(screen.getByRole('list', { name: 'Request path: ' + scenario.label }))
      expect(route.getByText(scenario.destination)).toBeVisible()
      expect(route.queryByText('Authorization') !== null).toBe(scenario.authorization !== null)
      expect(route.queryByText('ExceptionTranslationFilter') !== null).toBe(scenario.translation !== null)
      expect(screen.getByText(scenario.explanation)).toBeVisible()
    }
  })

  it('preserves the literal sample and renders markup as inert text', () => {
    const text = '{"sample":"<script>alert(1)</script>","count":3}'
    const view = render(<CodeSample language="json" text={text}/>)
    expect(screen.getByLabelText('Illustrative JSON body').textContent).toEqual(text)
    expect(view.container.querySelector('script')).toBeNull()
    expect(view.container.querySelector('.rd-token-field')).toHaveTextContent('"sample"')
  })
})
