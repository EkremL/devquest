## Open the context cabinet

~~~mission
open-auth-context
~~~

~~~passage
study-security-context
~~~
### Open the request’s security container

SecurityContext holds the current Authentication, which may be absent. The context is separate from the holder strategy and from any repository that might persist it. Read getAuthentication() before assuming a caller exists.

~~~passage
study-authentication
~~~
### Read one interface in two roles

Authentication can carry an unverified request to an AuthenticationManager or represent its accepted result. Inspect the concrete type, who created it, the principal and authorities, and its trust level before using it for decisions.

~~~passage
study-principal
~~~
### Resolve the represented identity

getPrincipal() returns an Object. Depending on the mechanism it may be a username, UserDetails, Jwt or another type. Do not hard-code a cast to a user entity without checking the configured mechanism. getName() provides a name under the implementation’s contract.

~~~passage
study-credentials
~~~
### Distinguish proof from identity

getCredentials() can hold evidence submitted for verification. Successful authentication may erase credentials. Do not infer that verification failed merely because credentials are null, and do not log raw proof. This cabinet uses redacted fictional values.

~~~passage
study-authorities
~~~
### Read grants without inferring ownership

getAuthorities() returns GrantedAuthority entries known to the token. They can represent application permissions, roles or scopes. A granted route authority does not itself establish a relationship to a stored resource.

## Compare trust states

~~~mission
compare-context-trust
~~~

~~~passage
study-anonymous
~~~
### Identify the anonymous placeholder

If enabled, AnonymousAuthenticationFilter can fill an empty authentication slot. AnonymousAuthenticationToken typically has isAuthenticated() true and may carry ROLE_ANONYMOUS. That flag alone is not evidence of a verified user. Use Spring’s anonymous-aware authorization or an AuthenticationTrustResolver when the policy needs this distinction. [Anonymous authentication](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/anonymous.html)

~~~passage
study-authenticated-state
~~~
### Check provenance and trust with the flag

An unauthenticated username/password token carries proposed evidence and returns false from isAuthenticated(). The verified token in this fixture returns true. Only trusted framework or application code should be able to establish that trusted state. A true flag also occurs for anonymous tokens, so trust-aware policy interprets the flag with the token type and context.

## Trace the request lifetime

~~~mission
walk-context-lifecycle
~~~

~~~passage
study-holder
~~~
### Locate access to the current context

SecurityContextHolder delegates to a configurable strategy. The default Servlet strategy is thread-local. getContext() makes the current context available to the executing thread. createEmptyContext() builds a new container, and setContext() associates it with the active strategy. [Servlet authentication architecture](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/architecture.html)

~~~passage
study-context-lifecycle
~~~
### Distinguish request state from cross-request persistence

At request entry the configured infrastructure can load context from a SecurityContextRepository. During authentication it may replace the context, and downstream policy reads the accepted result. With SecurityContextHolderFilter, code must explicitly save if this context should be persisted. A request-local holder assignment does not itself store state for future requests. Servlet security clears the holder at request exit. [Context persistence](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/session-management.html)

## Cross the worker boundary

~~~mission
compare-context-threads
~~~

~~~passage
study-thread-local
~~~
### Give a worker its own boundary

With the default strategy a normal pool worker does not automatically acquire the caller’s current authentication. If a task genuinely needs it, use a supported wrapper such as DelegatingSecurityContextRunnable with the intended context. A wrapper scopes the value to task execution and restores or clears it on return. An explicit business identity can be preferable for work that outlives the request.

## Verify the cleanup contract

~~~mission
review-context-cleanup
~~~

~~~passage
study-safe-clearing
~~~
### Release the association even when execution throws

Spring Security cleans up standard Servlet requests through its filter infrastructure. When a top-level task owns an otherwise empty thread boundary, clear its holder in finally. Nested execution should restore any previous legitimate context. Use a supported propagation wrapper rather than leaving global or inherited state enabled for a pool. Verify a follow-up job sees the expected baseline.

### Run the worker wrapper against Spring Security

This method takes a context already prepared by trusted code. The example verifies scoped propagation. It does not validate credentials or load data from a request or a session.

~~~java
import org.springframework.security.concurrent.DelegatingSecurityContextRunnable;
import org.springframework.security.core.context.SecurityContext;

final class ContextTask {
    static Runnable scoped(SecurityContext context, Runnable job) {
        return new DelegatingSecurityContextRunnable(job, context);
    }
}
~~~

On a single-thread executor compare a plain job, a wrapped job and a job that throws. Run a final task to check the worker’s baseline.
