## Read the HTTP exchange

A desktop reporting client starts prompting for sign-in after a release. Its log says only “access failed.” The browser can still download the same report. As the engineer on call, you need to find out whether the desktop client sent usable evidence, whether a permission check refused it, or whether it reached a different route. Start with the request and the response together.

~~~passage
study-request-and-response
~~~
### Separate the request from the response

A request names an operation and a target and carries headers and, when appropriate, a body. The response carries a status code, headers and sometimes content. The examples below use HTTP/1.1 presentation. HTTP/2 and HTTP/3 encode the exchange differently while retaining the meanings of methods, fields and status codes. Correlate the response with the exact request including host, method and path. A working browser request to a sibling URL proves little about the failing request.

~~~http
GET /reports/42 HTTP/1.1
Host: reports.example.test
Accept: application/json

HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="reports"
Content-Length: 0
~~~

~~~passage
study-authentication-headers
~~~
### Sort the headers by sender and purpose

The server announces an applicable HTTP authentication scheme using `WWW-Authenticate`. The client can answer with `Authorization`. A session-oriented application sends `Set-Cookie` when asking the browser to store a cookie. Later, the browser sends matching cookie pairs in `Cookie`. These are different conversations. `Content-Type` can help a login endpoint decode its body, but it carries no authentication evidence by itself. A forward proxy can issue a separate `407` and `Proxy-Authenticate` challenge, with credentials supplied through `Proxy-Authorization` for that proxy. Identify the intended receiver before attaching a credential.

~~~passage
study-authorization-header
~~~
### Treat Authorization as incoming evidence

Read the scheme before interpreting its credential. In `Authorization: Bearer example-token`, `Bearer` selects the authentication mechanism. The value here is a placeholder. An inbound header remains untrusted until the configured verifier accepts it. In a Spring Security 7.1 application, authentication mechanisms establish the caller for later authorization decisions. A header’s field name does not grant access to a report. Preserve credentials only on intended hops and redact the whole field value in diagnostics.

~~~passage
study-www-authenticate
~~~
### Read the applicable challenge

A `401` response must include at least one applicable `WWW-Authenticate` challenge. Read its scheme and parameters before changing how a client authenticates. `Bearer realm="reports"` names the scheme and identifies the protection context. A realm tells the client about the challenge. It does not establish entitlement or tell the client to send a secret to an arbitrary host. A single response can advertise more than one challenge, including across repeated field lines. Use an HTTP library and a scheme-aware parser where challenge interpretation is needed. Commas can separate both parameters and challenges.

## Trace the credential

~~~passage
study-basic-auth
~~~
### Basic sends a user and password on a request

With Basic, the client encodes a user identifier, a colon, and the password as Base64. The scheme defines the treatment of character encoding and prohibits a colon in the user identifier because the first colon separates the fields. The verifier decodes and checks the user/password pair. Base64 is reversible and supplies no confidentiality. A client may resend that pair on multiple requests to a protection space. A Basic exchange does not require a server-side session, though an application can configure persistence separately. Use the protection space and HTTPS deliberately, and keep the encoded value out of logs too.

~~~passage
study-bearer-auth
~~~
### Bearer sends a token for a protected resource

The `Authorization: Bearer …` form carries a possession-based credential. A verifier may check a token against a trusted service or validate it locally, depending on its format and contract. A Bearer token need not be a JWT. Its format alone establishes neither validity nor permission. Check that it is acceptable to this resource server, then evaluate the action and resource scope. A valid token for a different API can still be unacceptable here. Keep tokens out of query strings, where they can appear in history and logs. Use the documented header carrier when using the OAuth bearer-token profile.

~~~passage
study-cookie-credentials
~~~
### Cookies carry browser-managed values

A login response can set a cookie named `REPORT_SESSION` containing an opaque session identifier. The browser decides when to attach it using the cookie's host, path, security and site rules. The server looks up that identifier and decides whether it refers to usable state. Other applications can put different credential formats in cookies, and many cookies carry harmless preferences. When the browser attaches an authentication cookie automatically, state-changing requests need an explicit cross-site request forgery (CSRF) defense. Session 1.4 follows the server record; here, the key diagnostic is whether the cookie was set, retained and sent to the intended route.

~~~passage
study-login-body
~~~
### A login body follows an endpoint contract

A particular `POST /login` can accept a JSON object containing a user name and password. Another endpoint may require form encoding. Neither is a universal HTTP authentication scheme. The handler reads the expected body, validates evidence, then establishes a session or returns a token according to the contract. A successful login need not create a new HTTP resource. Putting credentials in a body does not encrypt the request or prevent tracing middleware from logging it. Send the required content type, keep credentials out of URLs, and disable body capture for the login route.

## Protect credentials with TLS

~~~passage
study-https-boundary
~~~
### Check which hop can see the credential

HTTPS uses TLS to protect HTTP data against observation and alteration in transit and lets the client authenticate the server when it verifies the certificate and host. An HTTP redirect to HTTPS cannot undo disclosure from the original plaintext request. Use HTTPS from the first credentialed request and keep certificate validation enabled. After TLS terminates at a gateway, that gateway sees the decrypted request. Review downstream transport and access separately. TLS also leaves secrets visible to endpoints that deliberately log bodies or headers. For the incident, capture a correlation ID, route, field presence, scheme and bounded verifier outcome. Omit credential values, raw cookies, login bodies and tokens.

## Diagnose before retrying

~~~passage
study-http-statuses
~~~
### Read status codes in the context of the operation

`200 OK` reports success. For a report GET, its content normally represents the report. `201 Created` reports creation of one or more resources. For a report job endpoint, a `Location` field can identify the new job. Status alone does not prove login or permission.

`400 Bad Request` can mean the server rejected malformed input such as invalid JSON. Read the endpoint's safe validation details. `401 Unauthorized` indicates absent usable authentication credentials for the target. Inspect the accompanying challenge. `403 Forbidden` means the server understood the request and refuses it. In the illustrated API, the verifier accepted the token but a required grant was absent.

`429 Too Many Requests` indicates rate limiting. If present, use `Retry-After` as server guidance. A retry still needs an appropriate operation and retry policy.

~~~passage
study-challenge-or-denial
~~~
### Find the first stage that stopped the request

The report service documents Bearer validation before its `report:read` check. The following gateway and application observations come from the same route. In the second response the Bearer scheme can describe insufficient scope even though the status is `403`. The presence of a challenge field by itself is therefore insufficient to classify the failure.

~~~reader
evidence
~~~

~~~reader
practice
~~~

The engineer discovers that the browser has a session for the dashboard UI and the desktop client calls a separate Bearer API. The fix is to follow the API's credential contract and verify the resulting grant. Test the witnessed route with missing evidence, accepted evidence without the action grant, and fully authorized evidence. Log only the reason category and correlation ID for each. Do not change the service to accept the browser's credential format on an unrelated endpoint simply because both callers read reports.

Use the Java 25 client-side example to make one part of the diagnosis repeatable. It looks up field names case-insensitively in the response's `HttpHeaders`. It classifies this API's next debugging step and deliberately leaves challenge parsing, authentication and retry decisions to their proper callers. A missing challenge is marked for investigation instead of triggering an automatic replay.

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

For the next incident, write down the target, observed evidence carrier, verifier result and first refused decision. Keep the client-facing exchange separate from the server's policy evidence. Session 1.4 examines what changes when later requests refer back to server-side login state.

References for [HTTP semantics and authentication](https://www.rfc-editor.org/rfc/rfc9110.html), [Basic](https://www.rfc-editor.org/rfc/rfc7617.html), [OAuth Bearer usage](https://www.rfc-editor.org/rfc/rfc6750.html), [cookies](https://www.rfc-editor.org/rfc/rfc6265.html), [429](https://www.rfc-editor.org/rfc/rfc6585.html), [Java 25 HttpHeaders](https://docs.oracle.com/en/java/javase/25/docs/api/java.net.http/java/net/http/HttpHeaders.html) and [Spring Security 7.1 authentication architecture](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/architecture.html).
