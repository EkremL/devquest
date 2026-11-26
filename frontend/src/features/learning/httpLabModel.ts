export const demoBasic = { user: 'demo-reader', password: 'lab:only' } as const
export const basicPair = demoBasic.user + ':' + demoBasic.password

export function encodeDemoBasic() {
  return btoa(basicPair)
}

export function decodeDemoBasic(encoded: string) {
  const pair = atob(encoded)
  const separator = pair.indexOf(':')
  return { user: pair.slice(0, separator), password: pair.slice(separator + 1) }
}

export const carriers = [
  { id: 'none', label: 'No credential', receive: 'Protected route', verify: 'No evidence arrives. The resource can return its configured challenge.' },
  { id: 'basic', label: 'Basic', receive: 'Basic authentication verifier', verify: 'Decode the user and password, then verify the pair under the configured mechanism.' },
  { id: 'bearer', label: 'Bearer', receive: 'Resource server token verifier', verify: 'Check token validity and its intended resource. Apply permission rules separately.' },
  { id: 'cookie', label: 'Session cookie', receive: 'Application session lookup', verify: 'Resolve the opaque handle to current session state. The browser attaches matching cookies.' },
  { id: 'login', label: 'JSON login', receive: 'Login endpoint body parser', verify: 'Parse the endpoint’s JSON contract, then verify the credentials before establishing a session or issuing a token.' },
] as const

export type Carrier = typeof carriers[number]['id']

export function buildRequest(carrier: Carrier, route: 'report' | 'job' = 'report') {
  const path = carrier === 'login' ? '/portal/login' : route === 'job' ? '/report-jobs' : '/reports/42'
  const method = carrier === 'login' || route === 'job' ? 'POST' : 'GET'
  const lines = [method + ' ' + path + ' HTTP/1.1', 'Host: reports.example.test', 'Accept: application/json']
  if (carrier === 'basic') lines.push('Authorization: Basic ' + encodeDemoBasic())
  if (carrier === 'bearer') lines.push('Authorization: Bearer demo-report-token')
  if (carrier === 'cookie') lines.push('Cookie: REPORT_SESSION=demo-session-id')
  if (carrier === 'login') {
    const body = JSON.stringify({ username: demoBasic.user, password: demoBasic.password })
    lines.push('Content-Type: application/json', 'Content-Length: ' + new TextEncoder().encode(body).length, '', body)
  } else if (method === 'POST') {
    lines.push('Content-Length: 0')
  }
  const activeLine = carrier === 'none' ? undefined : carrier === 'login' ? lines.length - 1 : 3
  return { method, path, text: lines.join('\n'), activeLine }
}

export function transportState(front: 'http' | 'https', upstream: 'http' | 'https') {
  return {
    ingress: front === 'https' ? 'TLS protected' : 'Readable in transit',
    downstream: upstream === 'https' ? 'TLS protected' : 'Readable in transit',
    gateway: front === 'https' ? 'Terminates client TLS and sees HTTP' : 'Receives plaintext HTTP',
    protectedHops: Number(front === 'https') + Number(upstream === 'https'),
  }
}

export const diagnostics = [
  { id: 'report', label: 'Read report', carrier: 'bearer', status: '200 OK', header: 'Content-Type: application/json',
    body: '{"reportId":42}', verifier: 'Bearer token accepted', authority: 'report:read · allowed',
    next: 'Read report representation', reason: 'The GET succeeded and returned the requested representation.' },
  { id: 'job', label: 'Create job', carrier: 'bearer', status: '201 Created', header: 'Location: /report-jobs/17',
    body: '', verifier: 'Bearer token accepted', authority: 'report:create · allowed',
    next: 'Follow the created job location', reason: 'The job already exists. Repeating the non-idempotent creation request can create a second job.' },
  { id: 'format', label: 'Parse login', carrier: 'login', status: '400 Bad Request', header: 'Content-Type: application/json',
    body: '{"error":"invalid JSON"}', verifier: 'Body rejected before verification', authority: 'No grant check',
    next: 'Correct the request body format', reason: 'Inspect the endpoint’s content and JSON contract. The request stopped before credential verification.' },
  { id: 'challenge', label: 'Sign-in prompt', carrier: 'none', status: '401 Unauthorized', header: 'WWW-Authenticate: Bearer realm="reports"',
    body: '', verifier: 'No usable credentials', authority: 'Grant check not reached',
    next: 'Inspect the applicable challenge', reason: 'This target expects valid Bearer evidence. Use this challenge to identify the supported scheme and verify the approved client contract.' },
  { id: 'scope', label: 'Scope refusal', carrier: 'bearer', status: '403 Forbidden', header: 'WWW-Authenticate: Bearer error="insufficient_scope", scope="report:read"',
    body: '', verifier: 'Bearer token accepted', authority: 'report:read · missing',
    next: 'Investigate the missing permission', reason: 'The verifier accepted the token in this fixture. The status, scheme parameter and audit outcome identify the action check.' },
  { id: 'limit', label: 'Rate limit', carrier: 'bearer', status: '429 Too Many Requests', header: 'Retry-After: 30',
    body: '', verifier: 'Rate limiter did not require a verifier result', authority: 'No grant decision recorded',
    next: 'Use retry guidance for a safe request', reason: 'The report GET may be retried after the indicated delay under the client’s policy. The response says nothing about the token’s validity.' },
] as const satisfies readonly { id: string; label: string; carrier: Carrier; status: string; header: string; body: string; verifier: string; authority: string; next: string; reason: string }[]

export type Diagnostic = typeof diagnostics[number]['id']

export function exchange(id: Diagnostic) {
  const scenario = diagnostics.find(item => item.id === id)!
  const request = buildRequest(scenario.carrier, id === 'job' ? 'job' : 'report')
  const invalid = id === 'format' ? '{"username":' : ''
  const requestText = id === 'format'
    ? request.text.replace(/Content-Length: \d+\n\n.*$/, 'Content-Length: ' + invalid.length + '\n\n' + invalid)
    : request.text
  const responseText = 'HTTP/1.1 ' + scenario.status + '\n' + scenario.header +
    '\nContent-Length: ' + new TextEncoder().encode(scenario.body).length + (scenario.body ? '\n\n' + scenario.body : '')
  return { ...scenario, requestText, responseText }
}

export const investigation = {
  request: 'GET /reports/42 HTTP/1.1\nHost: api.reports.example.test\nCookie: REPORT_SESSION=demo-session-id',
  response: 'HTTP/1.1 401 Unauthorized\nWWW-Authenticate: Bearer realm="reports"\nContent-Length: 0',
  fields: [
    { name: 'carrier', label: 'What actually arrived?', options: ['Basic Authorization', 'Session cookie', 'Bearer Authorization'] },
    { name: 'hop', label: 'Where is TLS active?', options: ['Client to gateway only', 'Both connections', 'Gateway to API only'] },
    { name: 'next', label: 'What should the on-call engineer check?', options: ['Workspace permission first', 'Approved client’s Bearer header construction', 'Repeat the request as sent'] },
  ],
  expected: ['Session cookie', 'Client to gateway only', 'Approved client’s Bearer header construction'],
  explanations: [
    'The captured request has Cookie and no Authorization field.',
    'The gateway terminates client TLS. The separate application connection is HTTP in this trace.',
    'The API challenges for Bearer. Verify whether the approved client sends its intended Authorization header, without recording the credential value.',
  ],
} as const

export function checkInvestigation(values: readonly (string | null)[]) {
  return investigation.fields.findIndex((_, i) => values[i] !== investigation.expected[i])
}
