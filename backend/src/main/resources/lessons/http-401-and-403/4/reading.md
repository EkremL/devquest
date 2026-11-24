## Predict the response

A teammate can open the task summary. You cannot. Before resetting a password or granting a role, look at the decision the server made.

An ordinary HTTPS client calls `GET /api/tasks/summary` with HTTP Basic. Assume a healthy endpoint, no session cookie, no prior identity and no special AJAX header. The route requires `TASK_READ`. The outcomes below describe this pilot's configured handlers.

```reader
outcomes
```

```reader
practice
```

> ### Engineering tip
>
> Try the same prediction with no credentials, a wrong password and a reader with TASK_READ. Decide whether each request reaches MVC. The exchange comparison shows the evidence for all four.

> ### Key takeaway
>
> First ask whether the API has accepted an identity. Then ask whether that identity may read this resource.

## Read the status and the challenge

`Authentication` establishes which identity the server will accept for this request. `Authorization` evaluates a policy for an operation on a resource. A client may have an account or even have signed in elsewhere without presenting any proof that this API accepts. Conversely, proving an identity gives the server a subject to evaluate; the decision can still be refusal.

```passage
study-http-401
```

### A 401 challenges the client

A 401 means the request lacks valid authentication credentials for the target resource. The origin server must send at least one applicable challenge in `WWW-Authenticate`. In `Basic realm="Task API"`, Basic identifies the scheme and the realm labels a protection space. The client can decide whether it has suitable credentials and, if appropriate, issue another request over TLS. Basic encodes credentials reversibly, so transport confidentiality matters. [RFC 9110 on 401](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.2)

```passage
study-http-403
```

### A 403 communicates refusal

A 403 means the server understood the request and refuses to fulfill it. Insufficient authority is one reason. HTTP also permits refusals for reasons unrelated to credentials. The status alone cannot prove a particular principal authenticated or identify the failed rule. Repeating an identical request with the same credentials offers no reason for the decision to change. [RFC 9110 on 403](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.4)

> ### Common misconception
>
> A Basic realm identifies a protection space. A matching realm name does not grant TASK_READ or prove that the client authenticated.

### Explain the client decision

Suppose the body reads “please sign in” and the status is 401, but there is no challenge. Can a generic HTTP client determine the authentication scheme from the standard response fields?

> ### Guided explanation
>
> A human-readable sentence may help a person, yet it does not supply the protocol field that names the scheme. Changing only the body will leave that defect intact.

> ### Key takeaway
>
> Read the status and the challenge together. A 401 names a way to authenticate; a 403 records a refusal whose cause needs context.

## Compare four exchanges

The following excerpts omit transport details. Each request has the same method, resource and Accept header. Authorization values are deliberately redacted. The JSON bodies illustrate this API's contract.

```passage
study-missing-credentials
```

### When the request carries no credentials

Request A carries no Authorization header. The Basic filter has no credentials to verify. When the protected route requires an identity, the configured entry point sends a 401 with a Basic challenge.

```http
GET /api/tasks/summary HTTP/1.1
Host: tasks.example
Accept: application/json
```

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Basic realm="Task API"
Content-Type: application/json

{"code":"authentication_required"}
```

```passage
study-invalid-credentials
```

### When verification rejects the credentials

A Basic header with a wrong password starts an authentication attempt. Verification fails, so the Basic filter invokes its entry point before authorization or MVC. The client receives the same 401 and Basic challenge as a client that sent no credentials. Matching the public responses gives both clients a recovery path without disclosing which usernames exist.

```passage
study-insufficient-authority
```

### A verified identity can still lack permission

Request C proves its identity, but the caller has only `TASK_CREATE`. The read policy requires `TASK_READ`, so this API returns 403.

```http
GET /api/tasks/summary HTTP/1.1
Host: tasks.example
Authorization: Basic [redacted]
Accept: application/json
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"code":"access_denied"}
```

C has a verified identity with `TASK_CREATE`. The rule asks for `TASK_READ`. Creating and reading are independently assigned operations in this policy, so C receives the refusal above without a challenge or controller call. D's verified identity carries TASK_READ. The filter chain continues to the controller and this healthy endpoint returns:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"openTasks":3}
```

If C resets its password but keeps the same authorities, predict the next result.

> ### Guided explanation
>
> With valid replacement credentials the answer is still 403. Password verification and authority assignment answer different questions. D is a useful control because a successful request exercises both the policy and the application behind it.

> ### Key takeaway
>
> Holding the endpoint fixed lets you separate credential verification from authority assignment. The successful reader is your control case.

## Follow the Spring Security decision

In the Servlet stack, the selected SecurityFilterChain runs before the MVC controller. The Basic authentication filter processes a Basic credential when present. For our fresh request an absent header lets processing continue without a verified user. An anonymous Authentication object can exist downstream; its presence alone cannot prove that a user signed in.

### Where the response originates

```reader
request-flow
```

This teaching model follows one selected Servlet chain. It omits chain selection details, context repositories, request caching and other filters.

`ExceptionTranslationFilter` wraps downstream processing. When authorization raises an AccessDeniedException, the translator uses the authentication trust state to decide whether to start authentication or delegate an authenticated denial. It can also translate a downstream AuthenticationException. A failed Basic verification occurs earlier: the Basic filter invokes its configured entry point on failure. It need not throw through the downstream translator. Two 401s can therefore implicate different wiring. [Spring Security Servlet architecture](https://docs.spring.io/spring-security/reference/7.1/servlet/architecture.html)

```reader
practice
```

```passage
study-authentication-entry-point
```

### AuthenticationEntryPoint starts the challenge

The `AuthenticationEntryPoint` tells a client how to authenticate. In this Basic API it writes a 401 and the challenge header. A rejected password reaches it directly from the Basic filter. A request with no credentials reaches it through exception translation after the protected operation is denied.

```passage
study-access-denied-handler
```

### AccessDeniedHandler writes the refusal

When a verified caller lacks the required authority, exception translation delegates to the `AccessDeniedHandler`. Here it returns a 403 with the public denial code. Asking for credentials again would leave the missing read permission unresolved. The two handler registrations below keep those responses distinct.

### Wire the response contract deliberately

Illustrative Java bean method for Spring Boot 4.1.0 with managed Spring Security 7.1.0. The snippet assumes configured authentication and separately supplied handler beans with the response contracts described here. It was checked against documentation and was not compiled or executed.

```java
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
```

> ### Implementation details
>
> Follow the two references to `challenge`. One supplies the Basic authentication filter. The other sets the entry point for exception translation. Both need the same public contract. The access-denied handler is reserved here for an authenticated refusal. Moving that logic into a controller exception handler would miss requests stopped before MVC.

A form-login entry point may redirect to a login page. A bearer-token API uses a different scheme and challenge. Even the Basic defaults can vary with request headers, including special handling for XMLHttpRequest. This pilot fixes the mechanism, client and handlers explicitly. [Spring Security HTTP Basic reference](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/passwords/basic.html)

> ### Key takeaway
>
> Identical 401 responses can originate from different paths. Wire and verify both the Basic filter’s entry point and the entry point used by exception translation.

## Design the public error contract

```passage
study-json-errors
```

### One JSON contract across failure paths

Design the response in layers. First choose the status and required headers. Then choose a stable machine-readable code, set the JSON media type, and serialize the body once. A Basic entry point should set the challenge before committing the response. A denial handler can share the serializer while owning its distinct status and public code. Writing a JSON body after a container error dispatch or after committing the stream risks a replacement HTML response or a partial body.

```passage
study-safe-error-details
```

### Choose what the client can safely learn

Use the same public authentication error for absent and rejected credentials. An account-specific reason would let a caller distinguish which usernames exist.

A client needs to know whether to request credentials or explain that an operation is unavailable. A support engineer may need a correlation identifier, the selected policy and a coarse failure category. Keep operational evidence in access-controlled diagnostics.

> ### Security warning
>
> Avoid logging Authorization headers, cookies or raw credentials. Publishing exception messages can disclose account state, internal class names or policy details. A structured JSON envelope does not make its contents safe.

Consider this deliberately poor hypothetical response:

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error":"Account exists; password mismatch","handler":"InternalPasswordProvider"}
```

```reader
practice
```

### Repair the contract

The entry point sets status 401, the Basic challenge and the JSON media type before the serializer flushes. A minimal illustrative body is:

```json
{
  "code": "authentication_required"
}
```

Keep a restricted diagnostic event for support. Returning 200 with an error object breaks status-based clients; challenging an authenticated caller for an authority denial invites needless credential prompts.

> ### Key takeaway
>
> Status, challenge and JSON are one public contract. Give the client recovery information and keep account-specific diagnostics private.

## Diagnose a missing challenge

A CLI stopped offering Basic credentials after a JSON error redesign. Compare these hypothetical responses to the same GET. Both return JSON. Which path lost its challenge?

```reader
evidence
```

### Use the difference between the requests

First inspect the raw response status, headers and body for the same GET over the same connection path. Exclude a cached session, login redirects and special request headers. Keep request credentials out of the capture. Compare the direct application response with the response seen by the client if an intermediary could alter headers.

### Locate the response writer

Identify the selected chain and which entry point handled each synthetic request, using a debugger or redacted local diagnostics. If the missing-header case alone reaches a custom writer, inspect the entry point selected for exception translation. If both invoke the same writer, check its conditional branches and the moment the response is committed. A controller breakpoint staying silent is expected in both cases.

> ### Implementation details
>
> An illustrative defective entry point might set status 401 and call a shared JSON serializer that flushes the response immediately. Adding a header after that flush is too late. Correct the entry point to set status, the configured Basic challenge and media type before serialization. Check both entry-point paths. If the header is already present on the direct application response, changing the writer is unlikely to fix a downstream component stripping it.

### Final reasoning challenge

After correcting the header, suppose a signed-in task creator receives 401 when reading the summary. Name two explanations and one observation that separates them. Then specify the smallest regression matrix that would make you confident in the whole contract.

> ### Guided explanation
>
> Signing in to a dashboard does not establish a Basic identity for a fresh API request. Check whether the API accepted the intended synthetic principal on this request. If authentication succeeded and TASK_READ is absent, inspect the denial handler and selected rule for an incorrect challenge response. If there is no verified identity, inspect credential delivery and authentication before changing any permissions.

### The regression matrix

For verification, exercise missing credentials and invalid credentials separately through actual Basic processing. Assert 401, the Basic scheme and realm, JSON media type and the same safe public code for both. With valid credentials lacking TASK_READ assert 403, the refusal code and absence of protected data. With the required authority assert 200 and the expected summary. Observe controller entry only for the permitted case. A test injecting an already authenticated principal can isolate authorization but cannot establish that the Basic credential parser or its failure entry point works. This is a proposed verification plan; no fixture results are claimed.

> ### Key takeaway
>
> Compare the two authentication failure paths before editing policy. A difference in their headers tells you where to look next.
