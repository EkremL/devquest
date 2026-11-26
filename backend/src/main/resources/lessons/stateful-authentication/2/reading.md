## Follow the sign-in

~~~mission
follow-session-signin
~~~

~~~passage
study-server-side-state
~~~
### A session can be anonymous

The roster app stores form state before authenticating the operator. HTTP requests remain separate. The server uses a session record to associate requests across time. Its authentication context has to be established and saved by the configured mechanism.

~~~passage
study-session-identifiers
~~~
### Treat a live session handle as a credential

An opaque identifier selects a record. Its value should be unpredictable and reveal no account information. A client-supplied handle is still untrusted until it resolves to valid server state. Keep real handles out of URLs and logs.

~~~passage
study-session-creation
~~~
### Save context before the next request

Servlet `getSession()` can create a record. In a custom Spring sign-in, use the configured session strategy and save context through the configured `SecurityContextRepository` when it must survive later requests. Setting the holder for the current request alone does not establish persistence. [Spring Security 7.1 session management](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/session-management.html)

~~~passage
study-session-lookup
~~~
### Check the record before making an access decision

Servlet `getSession(false)` can return a valid existing session or `null` without allocating one. A configured session-backed security context repository can then restore authentication. Check cookie delivery, session lookup, restored identity and authorization separately.

## Inspect cookie delivery

~~~mission
inspect-session-cookie
~~~

~~~passage
study-session-cookies
~~~
### Compare the response directive with the request pair

`Set-Cookie` asks the browser to store a cookie and sets its attributes. The next `Cookie` request field contains pairs. The browser does not copy scope and security attributes back into that request field. The lab uses a host-only value without an explicit expiration. Browser session restoration is separate from server lifetime.

~~~passage
study-cookie-attributes
~~~
### Match the intended host, path and delivery policy

Omitting `Domain` makes this cookie host-only. `/roster` matches `/roster/today` and excludes `/roster-old`. Path scopes delivery and is a weak boundary between applications. Verify the browser-facing response. In a Servlet Spring Boot application, `server.servlet.session.cookie` settings are one configuration surface. [HTTP cookies](https://www.rfc-editor.org/rfc/rfc6265.html) · [Spring Boot 4.1 properties](https://docs.spring.io/spring-boot/4.1/appendix/application-properties/index.html)

~~~passage
study-cookie-httponly
~~~
### HttpOnly governs script access

A matching request can still carry a cookie that script-facing APIs cannot read. Maintain script-injection protections and redact incoming cookies in logs.

~~~passage
study-cookie-secure
~~~
### Secure governs transport eligibility

In this browser model, a Secure cookie needs HTTPS on the eligible target request. The flag does not protect storage, application memory, or what happens after TLS termination.

~~~passage
study-cookie-samesite
~~~
### Site is a different concept from origin

Site usually includes the scheme and registrable domain. Strict limits cross-site sending. Explicit Lax makes an exception for cross-site top-level navigation with a safe method. Explicit None requires Secure in this model, and other browser policies can still block delivery. Keep CSRF protection for state-changing requests. [OWASP cookie and session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

## Test both time limits

~~~mission
advance-session-clock
~~~

~~~passage
study-session-expiration
~~~
### An accepted request can renew idle time

In this application model the deadline is exclusive. At the first expired boundary, the session is unusable. Servlet `setMaxInactiveInterval` supplies an idle interval. The eight-hour absolute deadline is a separate application policy. The model uses trusted monotonic timestamps and checks the previous accepted activity before updating it.

~~~java
import java.time.Duration;
import java.time.Instant;

public class SessionWindow {
    private static final Duration IDLE_LIMIT = Duration.ofMinutes(15);
    private static final Duration ABSOLUTE_LIMIT = Duration.ofHours(8);

    static boolean usable(Instant authenticatedAt, Instant lastActivity, Instant now) {
        return Duration.between(lastActivity, now).compareTo(IDLE_LIMIT) < 0
                && Duration.between(authenticatedAt, now).compareTo(ABSOLUTE_LIMIT) < 0;
    }
}
~~~

At 14 idle minutes the check still passes. At 15 it fails. Activity at 7h 59m cannot keep the authenticated session alive at 8h. The Java method checks time. The surrounding repository handles lookup and invalidation.

## Route across nodes

~~~mission
trace-shared-session
~~~

~~~passage
study-shared-session-storage
~~~
### Find the repository actually used by the serving node

With node-local stores, B cannot restore a record written only on A. Sticky routing can reduce cross-node requests but cannot preserve a process-local record through a restart. A compatible shared repository lets both nodes look up the same state. Review serialization, concurrent requests, expiry, revocation visibility and outages independently. A store outage and a missing record are different observations. Withhold protected data in either case until authentication can be restored. [Spring Session](https://docs.spring.io/spring-session/reference/index.html)

## Rotate the identifier

~~~mission
rotate-session-id
~~~

~~~passage
study-session-fixation
~~~
### Retire the pre-login identifier at the identity boundary

A known pre-login ID must not keep resolving to authenticated state after sign-in. The modern Servlet strategy in Spring Security uses `HttpServletRequest.changeSessionId()` for an existing session by default. Its attributes can stay in the same session. A new authenticated session can receive a fresh identifier at creation. [Session fixation protection](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/session-management.html#servlet-authentication-session-management-session-fixation)

~~~passage
study-session-theft
~~~
### Revoke an exposed authenticated credential

Exposure of a live authenticated ID is a different incident from carrying an old handle through sign-in. Invalidate affected server state, remediate the source and require fresh authentication. Keep real credential values out of incident evidence.

## Verify logout

~~~mission
verify-session-logout
~~~

~~~passage
study-session-invalidation
~~~
### Confirm that the old record is unusable

Servlet `invalidate()` ends the session and unbinds attributes. A separate session can be created later. Confirm that the original ID cannot restore context on any serving node. Removing the browser’s cookie alone leaves the server record active until it expires or is invalidated.

~~~passage
study-session-logout
~~~
### Inspect the configured logout sequence

When CSRF protection is enabled the built-in logout POST is CSRF-protected. Spring Security’s standard handling invalidates the session and clears the current context and configured repository. This lab also configures matching browser cookie cleanup. An earlier request may already hold a context. Other devices and an external identity-provider session are separate. [Spring Security 7.1 logout](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/logout.html)

## Resolve the incident

~~~mission
investigate-session-incident
~~~

Record which hop sent the cookie, which repository answered, whether it restored a context, and what policy allowed. Use the independent assessment to apply those distinctions to unfamiliar cases.
