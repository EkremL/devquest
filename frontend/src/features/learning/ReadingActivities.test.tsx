import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InstructionFigure, ReadingPractice, RequestFlow } from './ReadingActivities'
import { CodeSample } from './CodeSample'
import pilot from '../../../../backend/src/main/resources/lessons/http-401-and-403/4/manifest.json'
import vocabulary from '../../../../backend/src/main/resources/lessons/identity-and-access-vocabulary/2/manifest.json'
import currentVocabulary from '../../../../backend/src/main/resources/lessons/identity-and-access-vocabulary/3/manifest.json'

describe('reading activities', () => {
  it('shows one trust-boundary step at a time and lets the learner revisit it', () => {
    render(<InstructionFigure visual={{ ...currentVocabulary.visuals['trust-path'], layout: 'stepper' }}/>)
    const previous = screen.getByRole('button', {name: 'Previous step'})
    const next = screen.getByRole('button', {name: 'Next step'})
    expect(previous).toHaveAttribute('aria-disabled','true')
    expect(screen.getByRole('status')).toHaveTextContent('Receive the evidence')
    expect(screen.queryByText('Verify the actor')).not.toBeInTheDocument()
    fireEvent.click(next)
    expect(screen.getByRole('status')).toHaveTextContent('Step 2 of 4')
    expect(screen.getByRole('status')).toHaveTextContent('Verify the actor')
    fireEvent.click(previous)
    expect(screen.getByRole('status')).toHaveTextContent('Receive the evidence')
  })

  it('hides the policy experiment result until run and resets it when inputs change', () => {
    const practice = { ...currentVocabulary.sections[2].practice, presentation: 'experiment' as const }
    render(<ReadingPractice practice={practice}/>)
    const run = screen.getByRole('button',{name:'Run this case'})
    expect(run).toBeDisabled()
    fireEvent.click(screen.getByRole('radio',{name:'Move task 17 to South.'}))
    expect(screen.queryByText(/Denied · scope check/)).not.toBeInTheDocument()
    fireEvent.click(run)
    expect(screen.getByText(/Denied · scope check/)).toBeVisible()
    fireEvent.click(screen.getByRole('radio',{name:'Change Maya’s display name.'}))
    expect(screen.queryByText(/Denied · scope check/)).not.toBeInTheDocument()
    fireEvent.click(run)
    expect(screen.getByText(/Allowed · both checks still pass/)).toBeVisible()
  })

  it('presents the decision flow in reading order and defines the comparison terms', () => {
    const view = render(<InstructionFigure visual={{ ...vocabulary.visuals['access-path'], layout: 'flow' }}/>)
    const stages = screen.getAllByRole('list')
    expect(within(stages[0]).getAllByRole('listitem').map(item => item.querySelector('strong')?.textContent))
      .toEqual(['Caller', 'Credentials', 'Verification', 'Authenticated principal'])
    expect(within(stages[1]).getByText('Allow or deny')).toBeVisible()
    view.rerender(<InstructionFigure visual={{ ...vocabulary.visuals['claim-and-proof'], layout: 'comparison' }}/>)
    expect(screen.getAllByRole('term').map(term => term.textContent)).toContain('Claimed identity')
    expect(screen.getByText('The caller says which account it is using.')).toBeVisible()
  })

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
