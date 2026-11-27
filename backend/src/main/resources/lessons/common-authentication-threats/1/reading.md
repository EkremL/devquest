## Read the incident signals

~~~mission
triage-auth-signals
~~~

~~~passage
study-credential-theft
~~~
### Treat exposed authenticators as compromised

Theft is loss of control of authentication evidence, whether a password, token or key. Revoke or rotate affected evidence, invalidate derived state where needed and preserve redacted audit records. An unusual login alone does not prove theft.

~~~passage
study-password-reuse
~~~
### Break the connection between services

Reusing a password lets a compromise at one service affect another. Encourage unique passwords and password managers. Screen new passwords against known-compromised choices and use phishing-resistant authentication where available. [NIST authenticator guidance](https://pages.nist.gov/800-63-4/sp800-63b.html)

~~~passage
study-brute-force
~~~
### Recognize a concentration of failed guesses

Many failures for one account suggest repeated guessing. Apply account-aware throttling and monitor source and aggregate patterns. A permanent lockout triggered externally can deny access to legitimate users.

~~~passage
study-stuffing
~~~
### Look for reuse at scale

Credential stuffing uses credentials already exposed elsewhere. Failures spread across accounts and unexpected successes can justify investigation, but aggregates alone cannot establish the origin of the evidence. Combine layered rate controls, breached-password screening and strong authentication.

## Trace the session transition

~~~mission
verify-session-boundary
~~~

~~~passage
study-fixation
~~~
### Rotate the identifier at the privilege transition

A pre-login session reference must not remain the authenticated reference after sign-in. In a modern Servlet configuration, Spring Security can use the container’s changeSessionId protection. Test the transition and confirm the old reference is no longer accepted. [Spring Security session management](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/session-management.html)

~~~passage
study-hijacking
~~~
### Contain exposure of an already authenticated session

Hijacking involves misuse of a current authenticated session. Secure and HttpOnly cookie settings, deliberate scope and server-side invalidation address different parts of the risk. HttpOnly limits script access to the cookie, but a compromised page can still initiate requests. Containment needs server-side invalidation and investigation.

## Audit public and private output

~~~mission
review-auth-observability
~~~

~~~passage
study-enumeration
~~~
### Check every externally observable difference

A public failure can reveal account existence through body, status, redirect or timing. Use a consistent public contract and test representative negative paths. Keep precise internal reason codes access-controlled and avoid secret-bearing event data. [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

~~~passage
study-logging
~~~
### Keep evidence useful and safe

Record failure reason categories, time and opaque correlation identifiers. Keep passwords, session references and bearer evidence out of logs at the application, gateway and telemetry layers. Verify the allowlist with synthetic events and review downstream retention. [OWASP logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

~~~passage
study-token-leakage
~~~
### Prevent secondary copies of bearer evidence

A bearer token can leak through logs, URLs, exposed client storage or support artifacts. Once exposure is confirmed, contain the affected scope, withdraw or invalidate the evidence through supported controls, and investigate its use with redacted metadata.

## Test the containment window

~~~mission
probe-auth-containment
~~~

~~~passage
study-replay
~~~
### Distinguish freshness from possession

Repeating previously valid authentication evidence is a replay risk. TLS protects a channel but does not make a separately exposed bearer credential non-reusable. Some protocols bind evidence to a proof key or enforce single use. Choose the property required by the application and verify its boundary. [RFC 8705](https://www.rfc-editor.org/rfc/rfc8705.html)

~~~passage
study-expiration
~~~
### Check the precise acceptance window

Idle and absolute timeouts serve different purposes. The idle clock can move when accepted activity renews it. The absolute limit stays anchored to issuance or login. Short validity bounds exposure, but does not remove every valid use during the window.

~~~passage
study-missing-revocation
~~~
### Prove cancellation on the protected path

Central invalidation helps only when the serving path observes it. A local-only bearer verifier can continue until expiry. If a current revocation result is required, define the outage behavior and verify that protected data stays closed.

### Verify the containment rule in Java

The fixture assumes integrity and the intended audience were checked elsewhere. The deadline is exclusive and current state is mandatory.

~~~java
import java.time.Instant;

final class ContainmentWindow {
    static boolean permits(Instant now, Instant expiry, boolean stateAvailable, boolean revoked) {
        return now.isBefore(expiry) && stateAvailable && !revoked;
    }
}
~~~

Run a known-good request, a withdrawn grant, an unavailable authority and a request exactly at expiry.

## Verify the corrected login contract

~~~mission
confirm-auth-incident
~~~

~~~passage
study-broken-flow
~~~
### Promote identity only after all required evidence passes

Review the entire flow including recovery, partial sign-in, session restoration and error paths. A password step can succeed while a required factor is still pending. Establish the full principal only on verified completion, rotate session identity as required and enforce authorization independently. Test a pending factor, rejected factor, successful completion, and invalidated state.
