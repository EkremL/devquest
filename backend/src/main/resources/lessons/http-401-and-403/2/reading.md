## Predict the response

The task dashboard has one failing call. The route exists, the summary service is healthy, and another teammate can open the same page. What would you ask the API for before changing a password or granting a role?

Use one contract throughout this lesson. An ordinary HTTPS client requests `GET /api/tasks/summary` with HTTP Basic, no session cookie, no prior identity and no special AJAX header. The endpoint requires the exact authority `TASK_READ`. This API issues a Basic challenge with JSON for authentication failures, returns a JSON refusal for insufficient authority, and returns the summary on success. These are hypothetical exchanges. The error handlers and sample policy belong to the teaching application.

### Predict before continuing

Consider four clients in order: one sends no credentials, one sends a wrong password, one proves its identity but has only TASK_CREATE, and one proves its identity with TASK_READ. For each, predict the status, whether the server issues a challenge, and whether the controller runs.

Keep your predictions for the exchange comparison below. If you predicted different public responses for the first two clients, ask what a client needs to recover and what a stranger might learn from the distinction.

## Read the status and the challenge

Authentication establishes which identity the server will accept for this request. Authorization evaluates a policy for an operation on a resource. A client may have an account or even have signed in elsewhere without presenting any proof that this API accepts. Conversely, proving an identity gives the server a subject to evaluate; the decision can still be refusal.

### What the HTTP standard says

A 401 means the request lacks valid authentication credentials for the target resource. The origin server must send at least one applicable challenge in `WWW-Authenticate`. In `Basic realm="Task API"`, Basic identifies the scheme and the realm labels a protection space. The realm grants no authority. The client can decide whether it has suitable credentials and, if appropriate, issue another request over TLS. Basic encodes credentials reversibly, so transport confidentiality matters. [RFC 9110 on 401](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.2)

A 403 means the server understood the request and refuses to fulfill it. Insufficient authority is one reason. HTTP also permits refusals for reasons unrelated to credentials. The status alone cannot prove a particular principal authenticated or identify the failed rule. Repeating an identical request with the same credentials offers no reason for the decision to change. [RFC 9110 on 403](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.4)

### Explain the client decision

Suppose the body reads “please sign in” and the status is 401, but there is no challenge. Can a generic HTTP client determine the authentication scheme from the standard response fields? It cannot. A human-readable sentence may help a person, yet it does not supply the protocol field that names the scheme. Changing only the body will leave that defect intact.

## Compare four exchanges

The following excerpts omit transport details. Each request has the same method, resource and Accept header. Authorization values are deliberately redacted. The JSON bodies illustrate this API's contract.

### A and B · No accepted credentials

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

A sends the request above. B adds a syntactically valid Basic header carrying a wrong password. Both receive the illustrated challenge, and neither reaches the controller. Internally A supplies nothing for the Basic filter to verify; B initiates authentication and fails verification. Matching public responses keep the recovery contract consistent without revealing which usernames exist.

### C and D · Same proof mechanism, different policy decisions

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

C has a verified identity with TASK_CREATE. The rule asks for TASK_READ. Creating and reading are independently assigned operations in this policy, so C receives the refusal above without a challenge or controller call. D's verified identity carries TASK_READ. The filter chain continues to the controller and this healthy endpoint returns:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"openTasks":3}
```

If C resets its password but keeps the same authorities, predict the next result. With valid replacement credentials the answer is still 403. Password verification and authority assignment answer different questions. D is a useful control because a successful request exercises both the policy and the application behind it.

## Follow the Spring Security decision

In the Servlet stack, the selected SecurityFilterChain runs before the MVC controller. The Basic authentication filter processes a Basic credential when present. For our fresh request an absent header lets processing continue without a verified user. An anonymous Authentication object can exist downstream; its presence alone cannot prove that a user signed in.

### Where the response originates

```text
Missing Basic header -> continue -> authorization denies anonymous request
  -> ExceptionTranslationFilter -> AuthenticationEntryPoint -> 401
Bad Basic password -> BasicAuthenticationFilter attempts authentication
  -> authentication fails -> its AuthenticationEntryPoint -> 401
Accepted identity -> authorization denies missing authority
  -> ExceptionTranslationFilter -> AccessDeniedHandler -> 403
Accepted identity and required authority -> controller -> summary
```

This teaching model omits chain selection details, context repositories, request caching and other filters. ExceptionTranslationFilter wraps downstream processing. When authorization raises an AccessDeniedException, the translator uses the authentication trust state to decide whether to start authentication or delegate an authenticated denial. It can also translate a downstream AuthenticationException. A failed Basic verification occurs earlier: the Basic filter invokes its configured entry point on failure. It need not throw through the downstream translator. Two 401s can therefore implicate different wiring. [Spring Security Servlet architecture](https://docs.spring.io/spring-security/reference/7.1/servlet/architecture.html)

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

Follow the two references to challenge. One supplies the Basic authentication filter. The other sets the entry point for exception translation. Both need the same public contract. The access-denied handler is reserved here for an authenticated refusal. Moving that logic into a controller exception handler would miss requests stopped before MVC.

A form-login entry point may redirect to a login page. A bearer-token API uses a different scheme and challenge. Even the Basic defaults can vary with request headers, including special handling for XMLHttpRequest. This pilot fixes the mechanism, client and handlers explicitly. [Spring Security HTTP Basic reference](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/passwords/basic.html)

## Design the public error contract

Design the response in layers. First choose the status and required headers. Then choose a stable machine-readable code, set the JSON media type, and serialize the body once. A Basic entry point should set the challenge before committing the response. A denial handler can share the serializer while owning its distinct status and public code. Writing a JSON body after a container error dispatch or after committing the stream risks a replacement HTML response or a partial body.

### Decide what each audience needs

A client needs to know whether to request credentials or explain that an operation is unavailable. A support engineer may need a correlation identifier, the selected policy and a coarse failure category. Keep operational evidence in access-controlled diagnostics. Avoid logging Authorization headers, cookies or raw credentials. Publishing exception messages can disclose account state, internal class names or policy details. A structured JSON envelope does not make its contents safe.

Consider this deliberately poor hypothetical response:

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error":"Account exists; password mismatch","handler":"InternalPasswordProvider"}
```

Which change helps the client, and which changes protect the account holder? Add the applicable Basic challenge for the client. Replace the account-specific detail and provider name with the same public code used for missing credentials. Preserve a restricted diagnostic event sufficient to investigate the failure. Returning 200 with an error object would also break status-based clients. Returning 401 for an authenticated authority denial would encourage needless credential prompts.

## Diagnose a missing challenge

A regression report says a CLI stopped offering Basic credentials after a JSON error redesign. With no Authorization header the status is 401, the media type is JSON and the challenge is absent. With a wrong password the status is also 401, but the Basic challenge is present. These are hypothetical observations. They isolate a smaller problem than “login is broken.”

### Use the difference between the requests

First inspect the raw response status, headers and body for the same GET over the same connection path. Exclude a cached session, login redirects and special request headers. Keep request credentials out of the capture. Compare the direct application response with the response seen by the client if an intermediary could alter headers.

Next identify the selected chain and which entry point handled each synthetic request, using a debugger or redacted local diagnostics. If the missing-header case alone reaches a custom writer, inspect the entry point selected for exception translation. If both invoke the same writer, check its conditional branches and the moment the response is committed. A controller breakpoint staying silent is expected in both cases.

An illustrative defective entry point might set status 401 and call a shared JSON serializer that flushes the response immediately. Adding a header after that flush is too late. Correct the entry point to set status, the configured Basic challenge and media type before serialization. Check both entry-point paths. If the header is already present on the direct application response, changing the writer is unlikely to fix a downstream component stripping it.

### Final reasoning challenge

After correcting the header, suppose a signed-in task creator receives 401 when reading the summary. Name two explanations and one observation that separates them. Then specify the smallest regression matrix that would make you confident in the whole contract.

Model reasoning: signing in to a dashboard does not establish a Basic identity for a fresh API request. Check whether the API accepted the intended synthetic principal on this request. If authentication succeeded and TASK_READ is absent, inspect the denial handler and selected rule for an incorrect challenge response. If there is no verified identity, inspect credential delivery and authentication before changing any permissions.

For verification, exercise missing credentials and invalid credentials separately through actual Basic processing. Assert 401, the Basic scheme and realm, JSON media type and the same safe public code for both. With valid credentials lacking TASK_READ assert 403, the refusal code and absence of protected data. With the required authority assert 200 and the expected summary. Observe controller entry only for the permitted case. A test injecting an already authenticated principal can isolate authorization but cannot establish that the Basic credential parser or its failure entry point works. This is a proposed verification plan; no fixture results are claimed.
