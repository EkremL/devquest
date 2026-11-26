import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SecurityDecisionPlayground } from './SecurityDecisionPlayground'
import { baseline, evaluateSecurityDecision, type SecurityScenario } from './securityDecision'

describe('security decision', () => {
  it.each([
    ['claim', 'task:create', 'North', 401, 1, /no authenticated principal.*checks neither the grant nor the task’s workspace/],
    ['claim', 'task:create', 'South', 401, 1, /no authenticated principal.*checks neither the grant nor the task’s workspace/],
    ['claim', 'task:read', 'North', 401, 1, /no authenticated principal.*checks neither the grant nor the task’s workspace/],
    ['claim', 'task:read', 'South', 401, 1, /no authenticated principal.*checks neither the grant nor the task’s workspace/],
    ['verified', 'task:create', 'North', 403, 2, /task:create, which does not authorize reading.*workspace rule is never evaluated/],
    ['verified', 'task:create', 'South', 403, 2, /task:create, which does not authorize reading.*workspace rule is never evaluated/],
    ['verified', 'task:read', 'South', 403, 3, /stored workspace is South, outside Maya’s authorized North scope/],
    ['verified', 'task:read', 'North', 200, null, /matched Task 17’s stored North workspace to her authorized North scope/],
  ] as const)('evaluates and explains %s, %s, %s', (evidence, authority, workspace, status, stop, explanation) => {
    const scenario = Object.freeze({ evidence, authority, workspace } satisfies SecurityScenario)
    expect(evaluateSecurityDecision(scenario)).toMatchObject({ status, stop })
    expect(evaluateSecurityDecision(scenario)).toEqual(evaluateSecurityDecision({ ...scenario }))
    render(<SecurityDecisionPlayground/>)
    const pick = (name: string) => fireEvent.click(screen.getByRole('radio', { name }))
    pick(evidence === 'verified' ? 'Verified session for Maya' : 'Claim without verified evidence')
    pick(authority)
    pick(workspace)
    pick('200 OK')
    fireEvent.click(screen.getByRole('button', { name: 'Run request' }))
    const result = screen.getByRole('status')
    expect(result).toHaveTextContent(explanation)
    const steps = within(screen.getByRole('list', { name: 'Decision path' })).getAllByRole('listitem')
    expect(steps.map(step => step.dataset.state)).toEqual(steps.map((_, index) =>
      stop === null || index < stop ? 'Passed' : index === stop ? 'Stopped' : 'Not reached'))
  })

  it('reveals only on run, distinguishes scope from action, and clears stale results', () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    render(<SecurityDecisionPlayground/>)
    const path = () => within(screen.getByRole('list', { name: 'Decision path' }))
    const predict = within(screen.getByRole('group', { name: 'Predict the response' }))
    const result = screen.getByRole('status')
    const run = screen.getByRole('button', { name: 'Run request' })

    expect(run).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Permission is not scope' }))
    expect(screen.getByRole('radio', { name: 'South' })).toBeChecked()
    expect(result).toHaveTextContent('Permission is not scope loaded.')
    fireEvent.click(screen.getByRole('radio', { name: 'North' }))
    expect(result).not.toHaveTextContent('Permission is not scope loaded.')
    fireEvent.click(screen.getByRole('radio', { name: 'South' }))
    expect(path().getAllByText('Waiting')).toHaveLength(5)
    fireEvent.click(predict.getByRole('radio', { name: '200 OK' }))
    expect(path().getAllByText('Waiting')).toHaveLength(5)
    fireEvent.click(run)
    expect(path().getByText('Scope check').parentElement).toHaveTextContent('Stopped')
    expect(path().getByText('Protected task').parentElement).toHaveTextContent('Not reached')
    expect(result).toHaveTextContent('You predicted 200. The model returned 403.')

    fireEvent.click(screen.getByRole('radio', { name: 'task:create' }))
    expect(path().getAllByText('Waiting')).toHaveLength(5)
    expect(run).toBeDisabled()
    expect(result).not.toHaveTextContent('403 Forbidden')
    fireEvent.click(predict.getByRole('radio', { name: '403 Forbidden' }))
    fireEvent.click(run)
    expect(path().getByText('Action check').parentElement).toHaveTextContent('Stopped')
    expect(path().getByText('Scope check').parentElement).toHaveTextContent('Not reached')
    expect(result).toHaveTextContent('Your 403 prediction matches this run.')

    fireEvent.click(screen.getByRole('button', { name: 'A name is not proof' }))
    expect(result).not.toHaveTextContent('401 Unauthorized')
    fireEvent.click(predict.getByRole('radio', { name: '401 Unauthorized' }))
    fireEvent.click(run)
    expect(path().getByText('Authentication').parentElement).toHaveTextContent('Stopped')
    expect(path().getAllByText('Not reached')).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: 'Reset to baseline' }))
    expect(screen.getByRole('radio', { name: 'Verified session for Maya' })).toBeChecked()
    expect(screen.getByRole('radio', { name: baseline.authority })).toBeChecked()
    expect(screen.getByRole('radio', { name: baseline.workspace })).toBeChecked()
    expect(run).toBeDisabled()
    fireEvent.click(predict.getByRole('radio', { name: '200 OK' }))
    fireEvent.click(run)
    expect(path().getAllByText('Passed')).toHaveLength(5)
    expect(result).toHaveTextContent('Your 200 prediction matches this run.')
    expect(fetch).not.toHaveBeenCalled()
  })
})
