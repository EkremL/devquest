export const signInSteps = [
  { label: 'Open the app', source: 'Browser', message: 'GET /signin HTTP/1.1', browser: 'No session cookie', record: 'No session', context: 'None', explanation: 'An initial request enters the application without an established session.' },
  { label: 'Prepare the form', source: 'Session repository', message: 'HTTP/1.1 200 OK\nSet-Cookie: ROSTER_SESSION=demo-pre; Path=/; Secure; HttpOnly; SameSite=Lax', browser: 'demo-pre', record: 'Anonymous · form state', context: 'None', explanation: 'This application creates a pre-login session for form state. The session exists without an authenticated identity.' },
  { label: 'Submit evidence', source: 'Browser', message: 'POST /signin HTTP/1.1\nCookie: ROSTER_SESSION=demo-pre\n\n[fictional evidence and form token]', browser: 'demo-pre', record: 'Anonymous · form state', context: 'Verification pending', explanation: 'The session identifies form state. The configured mechanism must verify the submitted evidence separately.' },
  { label: 'Verify identity', source: 'Authentication mechanism', message: 'POST /signin · verification accepted', browser: 'demo-pre', record: 'Anonymous · form state', context: 'Iris · current request', explanation: 'Iris is established for this request. This step alone does not save the context for the next request.' },
  { label: 'Save context', source: 'Session repository', message: 'POST /signin · saving context before response', browser: 'demo-pre · replacement pending', record: 'demo-auth · authenticated · form state retained', context: 'Iris · saved for future requests', explanation: 'In this configuration, the existing session ID is rotated and the authentication is saved under the new ID before the response.' },
  { label: 'Receive cookie', source: 'Browser', message: 'HTTP/1.1 303 See Other\nLocation: /roster\nSet-Cookie: ROSTER_SESSION=demo-auth; Path=/; Secure; HttpOnly; SameSite=Lax', browser: 'demo-auth', record: 'demo-auth · authenticated', context: 'Iris · saved', explanation: 'The browser stores the replacement handle. The authentication context stays server-side.' },
  { label: 'Read protected roster', source: 'Security context', message: 'GET /roster HTTP/1.1\nCookie: ROSTER_SESSION=demo-auth\n\nHTTP/1.1 200 OK', browser: 'demo-auth', record: 'demo-auth · found', context: 'Iris · restored and authorized', explanation: 'This request presents the new handle. The configured repository restores authentication and the policy allows this roster read.' },
] as const

export type SameSite = 'Lax' | 'Strict' | 'None'
export type CookieProbe = {
  secure: boolean; httpOnly: boolean; sameSite: SameSite; secureTransport: boolean;
  host: string; path: string; context: 'same-site' | 'top-level-get' | 'cross-site-post';
}
const cookiePair = 'ROSTER_SESSION=demo-opaque'
const cookieHost = 'roster.example.test'
const cookiePath = '/roster'
export function inspectCookie(probe: CookieProbe) {
  const stored = probe.sameSite !== 'None' || probe.secure
  const pathMatches = probe.path === cookiePath || probe.path.startsWith(cookiePath + '/')
  const siteAllowed = probe.context === 'same-site' || probe.sameSite === 'None' ||
    (probe.sameSite === 'Lax' && probe.context === 'top-level-get')
  const reason = !stored ? 'SameSite=None requires Secure in this model' :
    probe.host !== cookieHost ? 'Host-only scope does not match' :
    !pathMatches ? 'Path scope does not match' :
    probe.secure && !probe.secureTransport ? 'Secure requires HTTPS for this target' :
    !siteAllowed ? 'SameSite excludes this request context' : 'The browser attaches the matching cookie'
  const sent = stored && probe.host === cookieHost && pathMatches && (!probe.secure || probe.secureTransport) && siteAllowed
  return {
    sent, stored, reason, scriptReadable: stored && !probe.httpOnly,
    header: 'Set-Cookie: ' + cookiePair + '; Path=' + cookiePath +
      (probe.secure ? '; Secure' : '') + (probe.httpOnly ? '; HttpOnly' : '') + '; SameSite=' + probe.sameSite,
    request: sent ? 'Cookie: ' + cookiePair : 'No Cookie header',
  }
}

export const idleMinutes = 15
export const absoluteMinutes = 480
export type Window = { now: number; last: number; invalidated: boolean }
export const windowStart: Window = { now: 0, last: 0, invalidated: false }
export function windowStatus(state: Window) {
  if (state.invalidated) return 'Invalidated'
  if (state.now >= absoluteMinutes && state.last + idleMinutes >= absoluteMinutes) return 'Absolute lifetime expired'
  if (state.now >= state.last + idleMinutes) return 'Idle timeout expired'
  return 'Active'
}
export function requestWindow(state: Window) {
  return windowStatus(state) === 'Active' ? { ...state, last: state.now } : state
}
export function sustainWindow(state: Window) {
  if (windowStatus(state) !== 'Active' || state.now >= absoluteMinutes - 1) return state
  let next = requestWindow(state)
  while (next.now < absoluteMinutes - 1) {
    next = requestWindow({ ...next, now: Math.min(next.now + 10, absoluteMinutes - 1) })
  }
  return next
}

export type NodeName = 'A' | 'B'
export type StoreMode = 'local' | 'shared'
export type StoreState = { mode: StoreMode; available: boolean; signedIn: boolean }
export function lookupNode(state: StoreState, node: NodeName) {
  if (!state.signedIn) return { readable: false, result: 'No session cookie', location: 'No record' }
  if (state.mode === 'shared' && !state.available) return { readable: false, result: 'Repository unavailable', location: 'Shared repository' }
  if (state.mode === 'local' && node === 'B') return { readable: false, result: 'Session record missing', location: 'Node B store' }
  return { readable: true, result: 'Context restored', location: state.mode === 'shared' ? 'Shared repository' : 'Node A store' }
}

export function inspectRotation(rotate: boolean) {
  return { current: rotate ? 'demo-new' : 'demo-pre', originalResolves: !rotate, state: 'Form state retained' }
}

export type LogoutMode = 'cookie' | 'invalidate' | 'complete'
export function inspectLogout(mode: LogoutMode) {
  return {
    cookie: mode === 'invalidate',
    session: mode === 'cookie',
    nextContext: mode === 'cookie',
    request: mode === 'cookie' ? 'Original ID still resolves in the model' : 'Original ID is invalid on the server',
    repository: mode === 'cookie' ? 'Stored context remains' : 'Stored context unavailable',
  }
}

export const incidentDecisions = [
  { id: 'cause', label: 'Why does node B fail?', options: ['The cookie expired', 'B cannot read A’s local session', 'The absolute deadline elapsed'], answer: 1 },
  { id: 'architecture', label: 'What should the rollout change?', options: ['Set a longer cookie lifetime', 'Trust session IDs when lookup fails', 'Use a compatible shared repository'], answer: 2 },
  { id: 'outage', label: 'What if that store is unavailable?', options: ['Return an error and withhold the roster', 'Return the roster from any cached identity', 'Treat the cookie as verified identity'], answer: 0 },
] as const
