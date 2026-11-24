## Predict the response

A task dashboard loads a summary on sign-in. One teammate reports that the app keeps asking for credentials. Another can sign in but still cannot read the summary. Before changing the policy, work out which decision each request failed.

### Set the conditions

In this hypothetical configuration, `GET /api/tasks/summary` uses HTTP Basic over HTTPS. There is no prior login state, login-page redirect, or alternate way to authenticate. The endpoint requires an authenticated identity with the `TASK_READ` authority. The configured handlers send a Basic challenge when authentication is required or credentials are rejected, and a 403 when an authenticated identity lacks permission. A permitted request returns the summary.

### Make a prediction

For each case, write down the expected status, whether the response challenges the client, and whether the request reaches the controller. Try this before reading the answer below.

A. The client sends no credentials.

B. The client sends Basic credentials with a wrong password.

C. The credentials are valid, but the account lacks `TASK_READ`.

D. The credentials are valid, and the account has `TASK_READ`.

### Compare with the expected responses

Illustrative HTTP exchange for case A. The empty response body is a choice for this example.

```http
GET /api/tasks/summary HTTP/1.1
Host: tasks.example
Accept: application/json
```

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Basic realm="Task API"
Content-Length: 0
```

In A and B, expect `401 Unauthorized` with a Basic challenge. In both cases the request lacks valid credentials for the resource. A begins without credentials. B presents credentials that authentication rejects. The public response need not reveal which account exists or why verification failed.

In C, expect `403 Forbidden` without a Basic challenge in this configuration. The server accepted the credentials and established an identity. The policy then refused that identity permission to read the summary. Retrying with the same credentials cannot change the authority decision.

In D, expect `200 OK` and the summary. Only D reaches the controller in this example. It is the control case that confirms the resource itself responds successfully.

### Trace where the request stops

This teaching diagram groups authentication decisions for clarity. In Spring Security, an anonymous request can reach authorization before the entry point issues the challenge. Rejected Basic credentials can trigger the entry point during authentication.

```text
GET /api/tasks/summary
  No valid identity         -> 401 + Basic challenge
  Valid identity
    Missing TASK_READ       -> 403
    Has TASK_READ           -> controller -> 200
```

HTTP requires a `WWW-Authenticate` challenge on a 401 response. A 403 means the server understood the request and refuses to fulfill it, which can have causes beyond the authority mismatch shown here. Spring Security's exact response also depends on the configured authentication mechanism, entry point, and denial handler. The examples are expected outcomes for the stated configuration and were not captured from a running lab.

### Official references

[RFC 9110 on 401 Unauthorized](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.2)

[RFC 9110 on 403 Forbidden](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.4)

[Spring Security 7.1 reference on HTTP Basic](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/passwords/basic.html)
