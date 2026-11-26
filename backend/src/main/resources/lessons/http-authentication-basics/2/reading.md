## Build the HTTP request

~~~mission
build-http-request
~~~

~~~passage
study-request-and-response
~~~
### Correlate two messages

The request names a method, target, host and headers, with a body where appropriate. The response carries a status, headers and possible content. The console displays HTTP/1.1 notation. HTTP/2 and HTTP/3 preserve those semantics with different wire formats. Match the method and target with the observed response before diagnosing a request.

~~~passage
study-authentication-headers
~~~
### Identify the sender of the field

`Authorization` and `Cookie` normally travel in the request. `WWW-Authenticate` and `Set-Cookie` serve different purposes in the response. `Content-Type` explains the login body’s representation. A proxy’s `407` uses `Proxy-Authenticate` and `Proxy-Authorization` for the proxy, a separate receiver from the origin.

~~~passage
study-authorization-header
~~~
### An Authorization field presents evidence

The scheme tells the receiver how to interpret the value. It does not establish that the credential is valid or that the caller may read the resource. Send only the intended evidence to the intended endpoint and redact the value in diagnostics.

~~~passage
study-www-authenticate
~~~
### Inspect the origin challenge

A `401` must include an applicable `WWW-Authenticate` challenge. Read its scheme and parameters with the route contract. A response can advertise several challenges. Commas can separate both challenge parameters and separate challenges, so use scheme-aware parsing. [HTTP authentication framework](https://www.rfc-editor.org/rfc/rfc9110.html#section-11)

## Decode Basic evidence

~~~mission
inspect-basic-encoding
~~~

~~~passage
study-basic-auth
~~~
### Locate the first colon

Basic represents the user identifier, one separator colon, and the password in Base64. The first colon separates the user identifier from the password, so the identifier cannot itself contain a colon. The lab uses fixed ASCII data. The actual scheme specifies its character-encoding rules. A reversible representation supplies no confidentiality and requires secure transport. Basic can be verified on each request without requiring a server-side session. [Basic authentication scheme](https://www.rfc-editor.org/rfc/rfc7617.html)

## Trace both TLS hops

~~~mission
trace-http-transport
~~~

~~~passage
study-https-boundary
~~~
### Draw a boundary at each endpoint

HTTPS with correct certificate and hostname validation protects the HTTP message in transit on that connection. A terminating gateway sees the decrypted message. A separate downstream connection needs its own TLS configuration and endpoint validation. Application memory, logging and stored values are separate concerns. Even a redirect to HTTPS after a plaintext request cannot undo the original disclosure. [TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446.html) · [HTTPS identity verification](https://www.rfc-editor.org/rfc/rfc9110.html#section-4.3.4)

## Assign the verifier

~~~mission
inspect-http-carriers
~~~

~~~passage
study-bearer-auth
~~~
### Validate a token for this resource

Bearer is a possession-based credential. It can be an opaque token or a token with local validation rules. Format reveals neither current validity nor applicable authority. Use the header carrier expected by this API and keep tokens out of URLs and diagnostic logs. [OAuth Bearer usage](https://www.rfc-editor.org/rfc/rfc6750.html)

~~~passage
study-cookie-credentials
~~~
### A cookie carries a value

Here the browser receives `Set-Cookie`, stores an opaque identifier and returns `Cookie` on matching requests. The server looks up usable session state. Automatically attached authentication cookies require appropriate cross-site request forgery protection for state-changing operations. Session 1.4 explores the server state and cookie lifetime. [HTTP state management](https://www.rfc-editor.org/rfc/rfc6265.html)

~~~passage
study-login-body
~~~
### A login body follows an endpoint contract

This lab models `POST /portal/login` accepting JSON, parsing it, and then verifying the submitted evidence. Another login endpoint can require form data. A successful login need not create an HTTP resource. Keep credentials out of URLs and prevent body capture on login routes.

## Diagnose the response

~~~mission
diagnose-http-response
~~~

~~~passage
study-http-statuses
~~~
### Read status with headers and operation semantics

The console compares report success (`200`), job creation (`201` with `Location`), malformed JSON (`400`), a challenge (`401`), a refusal (`403`) and throttling (`429`). `Retry-After`, where present, gives timing guidance. Decide whether retrying the operation is safe separately. A repeated create request can duplicate work. [429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585.html#section-4)

~~~passage
study-challenge-or-denial
~~~
### Identify the first failure

The `401` in the console lacks valid authentication evidence. The `403` in this API follows accepted authentication and a missing grant. A `403` alone has broader meaning. The Bearer insufficient-scope response can carry `WWW-Authenticate` too. Use both HTTP evidence and the sanitized verifier and policy observations.

The Java helper below classifies an already received response. It reads case-insensitive field names from `HttpHeaders` and flags a missing `401` challenge for investigation. It neither validates evidence nor retries an operation.

~~~java
import java.net.http.HttpHeaders;

public class ReportResponseAdvice {
    static String advise(int status, HttpHeaders headers) {
        return switch (status) {
            case 200 -> "report available";
            case 201 -> "inspect created resource";
            case 400 -> "inspect request format";
            case 401 -> headers.allValues("WWW-Authenticate").stream()
                    .anyMatch(value -> !value.isBlank())
                    ? "inspect authentication challenge" : "verify missing challenge";
            case 403 -> "inspect refusal and policy";
            case 429 -> "inspect rate limit and retry guidance";
            default -> "inspect route contract";
        };
    }
}
~~~

## Investigate the rollout

~~~mission
investigate-http-incident
~~~

Keep the route, field presence, supported scheme and bounded verifier outcome in the incident record. Exclude the credential value. Take the independent assessment to apply the same reasoning to new cases.
