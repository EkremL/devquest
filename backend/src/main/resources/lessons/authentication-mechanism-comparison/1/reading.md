## Route client evidence

~~~mission
route-mechanism
~~~

~~~passage
study-server-sessions
~~~
### Carry a reference to server state

A same-origin browser can send an HttpOnly, Secure session cookie. The server restores identity using the referenced record. The browser attaches a matching cookie automatically, so protect state-changing requests against CSRF and set cookie scope deliberately.

~~~passage
study-api-keys
~~~
### Attribute a machine integration

Give a managed integration a distinct high-entropy secret and an identifier for lookup, audit and rotation. Restrict permissions per key. A presented key is ordinarily bearer evidence of an integration, with no protocol guarantee that a particular employee sent it. Keep it out of URLs and browser bundles.

~~~passage
study-mutual-tls
~~~
### Locate proof of private-key possession

The TLS endpoint verifies a trusted client certificate and proof of its private key. Map the accepted certificate identity to an application principal and authorize separately. If TLS ends at a gateway, establish a trusted handoff and reject identity headers from other paths. [OAuth mutual TLS](https://www.rfc-editor.org/rfc/rfc8705.html)

~~~passage
study-client-context
~~~
### Compare who can keep which secret

A browser receives user interaction and can use a server-managed session. Public browser code cannot hold a confidential client secret. Managed workloads can use a secret store or certificate automation, and should have separate identities from human users.

## Test the withdrawal promise

~~~mission
probe-withdrawal
~~~

~~~passage
study-opaque-access
~~~
### Ask the authority about an opaque handle

In this model the API introspects every request and refuses protected responses if the authority is unavailable. The introspection endpoint is itself authenticated. Cached active results change the freshness contract. [RFC 7662](https://www.rfc-editor.org/rfc/rfc7662.html)

~~~passage
study-jwt-access
~~~
### Check locally under a configured profile

Use trusted keys and validate the intended issuer, audience and time limits before using a signed token for authorization. Local verification with cached keys avoids an introspection round trip. It has no automatic feed of grant changes. [Spring Security JWT Resource Server](https://docs.spring.io/spring-security/reference/7.1/servlet/oauth2/resource-server/jwt.html)

~~~passage
study-revoke
~~~
### Make the promise measurable

Ask whether a protected request must be blocked immediately or by a documented deadline. Current authoritative lookup can see revocation on its next check. A valid local-only JWT can remain eligible until expiration. Outage rules, cache TTL and replication delay determine the actual guarantee.

## Place the dependency

~~~mission
trace-mechanism-state
~~~

~~~passage
study-identity-providers
~~~
### Separate login or issuance from API verification

An OpenID Provider can authenticate users and establish a login relationship at multiple relying parties. An OAuth authorization server issues access tokens. Those roles can share infrastructure. Resource APIs still verify their own evidence and permissions. A login outage can stop new sessions or tokens while some established requests continue.

~~~passage
study-scaling
~~~
### Count reads on the protected request path

Shared session storage avoids node affinity but adds a serving dependency. Online introspection also adds latency and load. Local JWT verification spends CPU and depends on trusted key availability and rotation. Measure all three paths under load and failure.

## Audit storage

~~~mission
audit-mechanism-storage
~~~

~~~passage
study-storage
~~~
### Store different material in different places

The session cookie carries a reference while the server stores the record. Keep opaque and JWT bearer evidence out of logs and URLs. A machine API key belongs in managed secret storage, and a TLS private key belongs with its controlled workload or key provider. Distribute public verification keys through authenticated trusted configuration.

## Approve a migration

~~~mission
review-mechanism-choice
~~~

~~~passage
study-choose-mechanism
~~~
### Start from the requirement, then choose evidence

Specify caller type, cancellation deadline, available storage, trust termination and outage behavior. A human portal can use a shared session while a separate service uses mTLS for its managed workload. Mechanisms can coexist. Verify each path at its actual boundary before cutover.

### Verify the lookup rule in Java

The fixture has one policy decision with an explicit failure order. A withdrawn grant with a required live lookup fails. With local-only verification, this decision cannot see withdrawal. Try exact expiration as a separate boundary.

~~~java
final class DecisionWindow {
    static boolean allows(boolean liveLookup, boolean reachable,
                          boolean withdrawn, long now, long expiry) {
        return now < expiry && (!liveLookup || (reachable && !withdrawn));
    }
}
~~~

This is a policy fixture. It assumes all other authentication and authorization checks already passed.
