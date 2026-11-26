import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { RequestBuilder, ResponseConsole } from './HttpLab'
import { basicPair, buildRequest, checkInvestigation, decodeDemoBasic, demoBasic, diagnostics,
  encodeDemoBasic, exchange, investigation, transportState } from './httpLabModel'

it('renders every request carrier in its designated location', () => {
  expect(buildRequest('none')).toMatchObject({ activeLine: undefined, method: 'GET' })
  expect(buildRequest('basic').text).toContain('Authorization: Basic ' + encodeDemoBasic())
  expect(buildRequest('bearer').text).toContain('Authorization: Bearer demo-report-token')
  expect(buildRequest('cookie').text).toContain('Cookie: REPORT_SESSION=demo-session-id')
  expect(buildRequest('login')).toMatchObject({ method: 'POST', path: '/portal/login' })
  const login = buildRequest('login').text.split('\n\n')
  expect(JSON.parse(login[1])).toEqual({ username: demoBasic.user, password: demoBasic.password })
  expect(login[0]).toContain('Content-Length: ' + new TextEncoder().encode(login[1]).length)
  expect(buildRequest('bearer', 'job')).toMatchObject({ method: 'POST', path: '/report-jobs' })
})

it('round-trips the fixed Base64 fixture and preserves the colon within the password', () => {
  expect(atob(encodeDemoBasic())).toEqual(basicPair)
  expect(decodeDemoBasic(encodeDemoBasic())).toEqual(demoBasic)
  expect(demoBasic.user).not.toContain(':')
  expect(demoBasic.password).toContain(':')
})

it('reports the two independent transport boundaries', () => {
  expect(transportState('http', 'http')).toMatchObject({ protectedHops: 0, ingress: 'Readable in transit' })
  expect(transportState('https', 'http')).toMatchObject({ protectedHops: 1, downstream: 'Readable in transit' })
  expect(transportState('http', 'https')).toMatchObject({ protectedHops: 1, downstream: 'TLS protected' })
  expect(transportState('https', 'https').protectedHops).toBe(2)
})

it('pairs every response with a distinct diagnostic next step and the right wire facts', () => {
  expect(diagnostics.map(row => Number(row.status.split(' ')[0]))).toEqual([200, 201, 400, 401, 403, 429])
  expect(new Set(diagnostics.map(row => row.next)).size).toBe(6)
  expect(exchange('challenge').responseText).toContain('WWW-Authenticate: Bearer realm=')
  expect(exchange('scope').responseText).toContain('insufficient_scope')
  expect(exchange('scope').verifier).toBe('Bearer token accepted')
  expect(exchange('limit').responseText).toContain('Retry-After: 30')
  expect(exchange('job').responseText).toContain('Location: /report-jobs/17')
  expect(() => JSON.parse(exchange('format').requestText.split('\n\n')[1])).toThrow()
})

it('checks the final incident decisions independently', () => {
  expect(checkInvestigation(investigation.expected)).toBe(-1)
  for (const [index, field] of investigation.fields.entries()) {
    const changed: string[] = [...investigation.expected]
    changed[index] = field.options.find(value => value !== changed[index])!
    expect(checkInvestigation(changed)).toBe(index)
  }
})

it('requires tracing all five request carriers and clears the preceding explanation on a change', () => {
  const report = vi.fn()
  render(<RequestBuilder report={report}/>)
  const send = screen.getByRole('button', { name: 'Trace delivery' })
  expect(screen.getByRole('status')).toHaveTextContent('This request carries no authentication evidence.')
  fireEvent.click(send)
  expect(screen.getByRole('status')).toHaveTextContent('Protected route')
  for (const name of ['Basic', 'Bearer', 'Session cookie', 'JSON login']) {
    fireEvent.click(screen.getByRole('button', { name }))
    expect(screen.getByRole('status')).toHaveTextContent('Ready to trace')
    expect(report).not.toHaveBeenCalledWith(true)
    fireEvent.click(send)
  }
  expect(report).toHaveBeenLastCalledWith(true)
})

it('rejects and clears stale diagnostic feedback on a new case', () => {
  const report = vi.fn()
  render(<ResponseConsole report={report}/>)
  fireEvent.change(screen.getByRole('combobox', { name: /Next diagnostic action/ }), {
    target: { value: 'Investigate the missing permission' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Check diagnosis' }))
  expect(screen.getByRole('status')).toHaveTextContent('Recheck the response and verifier')
  fireEvent.click(screen.getByRole('button', { name: 'Scope refusal' }))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Check diagnosis' })).toBeDisabled()
  expect(report).not.toHaveBeenCalledWith(true)
})
