## Triage the request

~~~mission
triage-security-request
~~~

~~~passage
study-missing-credentials
~~~
### Missing evidence leaves an anonymous request

This fictional API protects `GET /api/tasks/summary` with `TASK_READ` and uses HTTP Basic with explicit JSON handlers. With no Basic header, the filter continues. There is no verified caller to satisfy the operation’s rule. A configured anonymous marker does not establish human sign-in.

~~~passage
study-invalid-credentials
~~~
### Rejected evidence stops at authentication

Rejected Basic evidence reaches the configured entry point from the Basic filter. The downstream authorization filter, translator and controller are not involved in that failure. Both missing and rejected credentials receive the same public 401 here.

~~~passage
study-insufficient-authority
~~~
### Test the granted action independently

The creator supplies valid credentials and establishes an identity. The rule needs `TASK_READ`, and `TASK_CREATE` does not satisfy it. Use the reader as the positive control. Changing a password would leave the missing grant unresolved.

## Trace the filter path

~~~mission
trace-security-filters
~~~

The diagram follows selected calls in one configured Servlet chain. `ExceptionTranslationFilter` wraps downstream execution. When `AuthorizationFilter` denies the request, the exception can return to the wrapper, which checks the authentication trust state to choose the appropriate response mechanism. It can also translate a downstream authentication exception. A Basic verification failure happens earlier and takes a direct failure callback. That difference matters even when both paths return identical 401s.

The trace omits chain selection, request caching and other filters. Use the configured chain and observed evidence to locate the real path. [Spring Security 7.1 Servlet architecture](https://docs.spring.io/spring-security/reference/7.1/servlet/architecture.html) · [HTTP Basic](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/passwords/basic.html)

## Route each response

~~~mission
route-security-handler
~~~

~~~passage
study-http-401
~~~
### A 401 challenges for applicable evidence

HTTP 401 means the request lacks valid authentication credentials for the target resource. An origin returning 401 must send an applicable `WWW-Authenticate` challenge. In this API it advertises Basic. Form-login redirects and other schemes follow their own contracts. [HTTP 401](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.2)

~~~passage
study-http-403
~~~
### A 403 communicates refusal

HTTP 403 does not universally establish that authentication succeeded. The configured Basic fixture sends 403 for a verified caller with an insufficient grant. It does not send a Basic challenge in that path. A Bearer API can advertise insufficient scope on a 403 under its own scheme. [HTTP 403](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.4) · [Bearer error response](https://www.rfc-editor.org/rfc/rfc6750.html#section-3.1)

~~~passage
study-authentication-entry-point
~~~
### An entry point starts authentication

This configured `AuthenticationEntryPoint` owns the challenge contract. The Basic filter invokes it directly after invalid credentials. Exception translation invokes it for this anonymous denial. Different invokers converge on the same public contract.

~~~passage
study-access-denied-handler
~~~
### A denial handler owns this verified refusal

Exception translation dispatches the insufficient-authority case to the configured `AccessDeniedHandler`. The controller does not run. Only the positive reader case reaches the protected MVC controller.

## Repair the response

~~~mission
repair-security-response
~~~

~~~passage
study-json-errors
~~~
### Commit one coherent public contract

Choose status, required headers and JSON representation before flushing the response. Once the Servlet response is committed, headers must already be set. The late-write interaction models a challenge absent from the public response because it was attempted after the flush.

~~~passage
study-safe-error-details
~~~
### Keep provider details in restricted diagnostics

Use one generic public error for missing and rejected authentication in this fixture. Record a correlation ID and a bounded failure category in restricted diagnostics. Keep account details, exception text, Authorization values and cookies out of public errors and ordinary logs.

## Match a request rule

~~~mission
match-security-rule
~~~

Spring Security `requestMatchers` selects the first matching authorization rule in this registry. A method and path can select the summary rule. Placing a broad subtree deny first can shadow it. Rule selection and caller verification happen at different stages. The simulator assumes earlier filters have run. For example, it does not model an early CSRF rejection on POST. [Spring Security 7.1 request authorization](https://docs.spring.io/spring-security/reference/7.1/servlet/authorization/authorize-http-requests.html)

This Spring Boot 4.1.0 configuration assumes two separately supplied handler beans and the application’s configured authentication. It wires the same entry point at the two relevant invokers. The snippet describes the wiring. The Coding Lab examines the behavior of the writer itself.

~~~java
@Bean
SecurityFilterChain taskApi(HttpSecurity http,
        AuthenticationEntryPoint challenge,
        AccessDeniedHandler refusal) throws Exception {
    http.authorizeHttpRequests(rules -> rules
            .requestMatchers(HttpMethod.GET, "/api/tasks/summary")
                .hasAuthority("TASK_READ")
            .anyRequest().denyAll())
        .httpBasic(basic -> basic.authenticationEntryPoint(challenge))
        .exceptionHandling(errors -> errors
            .authenticationEntryPoint(challenge)
            .accessDeniedHandler(refusal));
    return http.build();
}
~~~

## Debug the lab regression

~~~mission
debug-lab-challenge
~~~

Compare absent and rejected credentials at the same endpoint. Both should stop before MVC. Check the status, challenge, media type and body independently. Follow the selected entry point and inspect the response observed at the application and client boundaries. The downloadable Coding Lab contains the original standalone Java/JUnit exercise with its two intentional challenge failures.

## Resolve the security incident

~~~mission
investigate-security-incident
~~~

Explain the caller, applicable rule, last component reached and public contract. Use the independent assessment to diagnose unfamiliar cases. Open the Coding Lab to investigate an actual response in the standalone fixture.
