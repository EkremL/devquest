import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MissionActivity } from './MissionActivities'

const button = (name: string) => screen.getByRole('button', { name })

describe('identity learning missions', () => {
  it('requires both verification outcomes and clears the displayed decision when evidence changes', () => {
    const report = vi.fn()
    render(<MissionActivity id="verify-evidence" report={report}/>)
    expect(report).not.toHaveBeenCalled()
    fireEvent.click(button('Verify evidence'))
    expect(screen.getByRole('status')).toHaveTextContent('No principal established')
    fireEvent.click(button('Valid session'))
    expect(screen.getByRole('status')).toHaveTextContent('Awaiting verification')
    fireEvent.click(button('Verify evidence'))
    expect(screen.getByRole('status')).toHaveTextContent('Maya established')
    expect(report).not.toHaveBeenCalledWith(true)
    fireEvent.click(button('Expired session'))
    fireEvent.click(button('Verify evidence'))
    expect(screen.getByRole('status')).toHaveTextContent('Session rejected')
    expect(report).toHaveBeenLastCalledWith(true)
  })

  it('requires comparable principal and authority observations for the same verified actor', () => {
    const report = vi.fn()
    render(<MissionActivity id="inspect-context" report={report}/>)
    fireEvent.click(button('Principal'))
    expect(screen.getByRole('status')).toHaveTextContent('anonymousUser')
    fireEvent.click(button('Browser session'))
    fireEvent.click(button('Principal'))
    expect(screen.getByRole('status')).toHaveTextContent('UserDetails')
    fireEvent.click(button('Scheduled exporter'))
    fireEvent.click(button('Authorities'))
    expect(report).not.toHaveBeenCalledWith(true)
    fireEvent.click(button('Principal'))
    expect(screen.getByRole('status')).toHaveTextContent('nightly-exporter')
    expect(report).toHaveBeenLastCalledWith(true)
  })

  it('rejects an incorrect integrated decision and allows the learner to revise it', () => {
    const report = vi.fn()
    render(<MissionActivity id="review-request" report={report}/>)
    fireEvent.change(screen.getByLabelText('Established caller'), { target: { value: 'Maya' } })
    fireEvent.change(screen.getByLabelText('Trusted evidence'), { target: { value: 'Validated workload session' } })
    fireEvent.change(screen.getByLabelText('Policy result'), { target: { value: 'Stop at workspace check' } })
    fireEvent.click(button('Validate decision'))
    expect(screen.getByRole('status')).toHaveTextContent('Revisit established caller')
    expect(report).not.toHaveBeenCalledWith(true)
    fireEvent.change(screen.getByLabelText('Established caller'), { target: { value: 'nightly-exporter' } })
    fireEvent.click(button('Validate decision'))
    expect(screen.getByRole('status')).toHaveTextContent('Decision record complete')
    expect(report).toHaveBeenLastCalledWith(true)
  })
})
