export const scenarios = [
  { id:'missing',label:'No credentials',principal:'None · anonymous',grant:'None' },
  { id:'invalid',label:'Incorrect credentials',principal:'None · rejected',grant:'None' },
  { id:'creator',label:'Verified creator',principal:'demo-creator',grant:'TASK_CREATE' },
  { id:'reader',label:'Verified reader',principal:'demo-reader',grant:'TASK_READ' },
] as const
export type Scenario = typeof scenarios[number]['id']
export type ResultStatus = 200 | 401 | 403

export const components = {
  request:'Incoming request', basic:'BasicAuthenticationFilter', manager:'AuthenticationManager',
  context:'SecurityContext', wrapper:'ExceptionTranslationFilter', authorization:'AuthorizationFilter',
  entry:'AuthenticationEntryPoint', denied:'AccessDeniedHandler', controller:'Protected controller',
} as const
export type Component = keyof typeof components
type TraceStep = { id: Component; label: string; detail: string }
const start: TraceStep = { id:'request',label:'Request received',detail:'One selected Servlet security chain handles GET /api/tasks/summary.' }
const noHeader: TraceStep = { id:'basic',label:'No Basic credentials',detail:'The Basic filter finds no credentials and continues the downstream chain.' }
const basic: TraceStep = { id:'basic',label:'Basic evidence extracted',detail:'The Basic filter presents the supplied evidence to its AuthenticationManager.' }
const wrap: TraceStep = { id:'wrapper',label:'Wraps downstream call',detail:'Exception translation wraps the call into downstream filters. It has not handled an exception yet.' }
const allowWriter: TraceStep = { id:'controller',label:'Controller invoked',detail:'The controller runs after the TASK_READ rule passes and returns the successful JSON summary.' }

export function securityTrace(scenario: Scenario) {
  if (scenario === 'invalid') return {
    status:401, writer:'entry', caller:'basic', edge:'direct',
    steps:[start,basic,
      {id:'manager',label:'Authentication failed',detail:'The provider rejected the supplied evidence. No verified context is established.'},
      {id:'entry',label:'Direct callback · handler invoked',detail:'The Basic filter handles the failure and invokes its configured entry point. The downstream exception translator was never reached.'}],
  } as const satisfies { status: ResultStatus; writer: Component; caller: Component; edge: string; steps: readonly TraceStep[] }
  if (scenario === 'missing') return {
    status:401, writer:'entry', caller:'wrapper', edge:'exception',
    steps:[start,noHeader,
      {id:'context',label:'No verified caller',detail:'Configured anonymous processing may supply an anonymous marker. It does not establish authentication.'},wrap,
      {id:'authorization',label:'Access denied',detail:'The protected operation requires TASK_READ. The anonymous request has no matching authority.'},
      {id:'wrapper',label:'Exception translated',detail:'The downstream AccessDeniedException returns to the wrapper. The anonymous trust state calls for authentication.'},
      {id:'entry',label:'Challenge handler invoked',detail:'The entry point writes this API’s 401, applicable Basic challenge and generic JSON error.'}],
  } as const satisfies { status: ResultStatus; writer: Component; caller: Component; edge: string; steps: readonly TraceStep[] }
  const common = [start,basic,
    {id:'manager',label:'Authentication succeeded',detail:'The configured provider verifies the supplied evidence and returns an authenticated result.'},
    {id:'context',label:'Verified context established',detail:'The Basic filter places the authenticated result in the security context for this request.'},wrap] as const
  if (scenario === 'creator') return {
    status:403, writer:'denied', caller:'wrapper', edge:'exception',
    steps:[...common,
      {id:'authorization',label:'Access denied',detail:'TASK_CREATE does not satisfy TASK_READ in this configuration.'},
      {id:'wrapper',label:'Exception translated',detail:'The wrapper catches the downstream denial and delegates an authenticated refusal.'},
      {id:'denied',label:'Denial handler invoked',detail:'The configured handler writes a 403 and safe JSON. This Basic refusal does not issue a new challenge.'}],
  } as const satisfies { status: ResultStatus; writer: Component; caller: Component; edge: string; steps: readonly TraceStep[] }
  return {
    status:200, writer:'controller', caller:'authorization', edge:'normal',
    steps:[...common,{id:'authorization',label:'Authority rule passed',detail:'The verified reader has TASK_READ. The filter allows downstream processing.'},allowWriter],
  } as const satisfies { status: ResultStatus; writer: Component; caller: Component; edge: string; steps: readonly TraceStep[] }
}

export function diagnosticRequest(scenario: Scenario) {
  return 'GET /api/tasks/summary HTTP/1.1\nHost: tasks.example.test\nAccept: application/json' +
    (scenario === 'missing' ? '' : '\nAuthorization: Basic [fictional evidence redacted]')
}

export const statusNames = { 200:'OK',401:'Unauthorized',403:'Forbidden' } as const
const models = { 401:'authentication_required',403:'access_denied' } as const
export function responseMessage(status: ResultStatus, challenge: boolean, contentType: string, body: string) {
  return 'HTTP/1.1 ' + status + ' ' + statusNames[status] +
    (challenge ? '\nWWW-Authenticate: Basic realm="task-debugger"' : '') +
    (contentType ? '\nContent-Type: ' + contentType : '') + '\n\n' + body
}

export function successfulContract(status: ResultStatus) {
  return responseMessage(status,status === 401,'application/json',status === 200 ? '{"openTasks":3}' : JSON.stringify({code:models[status]}))
}

export type DraftResponse = { status: ResultStatus; challenge: boolean; media: 'json' | 'text'; safe: boolean; early: boolean }
export function commitResponse(expected: 401 | 403, draft: DraftResponse) {
  const challenge = draft.challenge && draft.early
  const body = draft.safe ? JSON.stringify({code:models[expected]}) : '{"error":"Internal provider rejected account"}'
  const mistakes = [
    draft.status === expected ? null : 'Use the status required by this failure path.',
    draft.challenge && !draft.early ? 'The challenge write occurred after commitment and was ignored.' : null,
    expected === 401 && !challenge ? 'A 401 needs an applicable Basic challenge in this fixture.' : null,
    expected === 403 && challenge ? 'This Basic refusal contract does not advertise a challenge.' : null,
    draft.media === 'json' ? null : 'Set a JSON media type for the JSON body.',
    draft.safe ? null : 'Keep internal account and provider details out of the public body.',
  ].filter(message => message !== null)
  return { mistakes,text:responseMessage(draft.status,challenge,draft.media === 'json' ? 'application/json' : 'text/plain',body) }
}

export type MatcherInput = { method: 'GET' | 'POST'; path: '/api/tasks/summary' | '/api/tasks/archive' | '/status'; grant: 'None' | 'TASK_READ' | 'TASK_CREATE'; broadFirst: boolean }
export function matchRule(input: MatcherInput) {
  const summary = input.method === 'GET' && input.path === '/api/tasks/summary'
  const broad = input.path.startsWith('/api/tasks/')
  if (broad && input.broadFirst) return { rule:'Task subtree deny', allowed:false, reason:'The first matching rule denies the task subtree before the exact route can be considered.' }
  if (summary) return { rule:'Summary GET',allowed:input.grant === 'TASK_READ',reason:input.grant === 'TASK_READ'
    ? 'The exact method and path matched, and this caller has TASK_READ.' : 'The exact rule needs a verified TASK_READ grant.' }
  if (broad) return { rule:'Task subtree deny',allowed:false,reason:'The task subtree rule caught this request after the exact GET rule did not match.' }
  return { rule:'Fallback deny',allowed:false,reason:'No earlier rule applies. The configured fallback denies.' }
}

export const finalDecisions = [
  { key:'verified',label:'Authentication outcome',options:['Verified creator','Credentials rejected','No evidence'],answer:0 },
  { key:'rule',label:'Matched authority rule',options:['TASK_CREATE','TASK_READ','No rule matched'],answer:1 },
  { key:'stop',label:'Where processing stopped',options:['Provider validation','AuthorizationFilter','Protected controller'],answer:1 },
  { key:'writer',label:'Expected response writer',options:['AuthenticationEntryPoint','Protected controller','AccessDeniedHandler'],answer:2 },
  { key:'contract',label:'Is the public response correct?',options:['Yes, a 401 is correct','No, this Basic refusal needs 403 without a challenge'],answer:1 },
  { key:'next',label:'Next diagnostic step',options:['Reassign TASK_READ now','Inspect denial-handler mapping and response contract','Change the caller password'],answer:1 },
] as const
