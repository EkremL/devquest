## Verify the evidence

~~~mission
verify-evidence
~~~

~~~passage
study-identity
~~~
### The account name is a claim

Maya’s account is an identity recognized by the task system. A submitted name selects which account the request claims. Only a successful verifier can associate this request with the account. An established identity can represent a human or a workload.

~~~passage
study-credential
~~~
### Evidence has to reach a verifier

A password or session credential can provide evidence under an agreed mechanism. A session credential is checked against server-held state in this example. The application still has to validate the evidence and establish whom it represents. Keep its raw value out of diagnostic records.

~~~passage
study-authentication
~~~
### Authentication establishes the caller

Check the result after each change in the circuit. Missing evidence leaves only a claim. Rejected evidence establishes no caller. Accepted evidence lets the application use Maya as the authenticated caller for this request. The permission decision comes later.

## Inspect the caller

~~~mission
inspect-context
~~~

~~~passage
study-principal
~~~
### Open the principal and authorities

A Spring Servlet `SecurityContext` contains an `Authentication` when one is available. After authentication, `getPrincipal()` identifies the caller in the mechanism’s representation. `getAuthorities()` supplies configured roles, scopes or permissions to policy. A password-based mechanism often exposes `UserDetails`. Other mechanisms can use another type. Handle the type your application configures.

An `Authentication` can represent evidence awaiting verification or an anonymous placeholder. A non-null object, and a flag read without understanding the token type, are insufficient evidence of human sign-in. Use the application’s configured authentication and authorization mechanisms.

~~~passage
study-subject
~~~
### Ask who the statement describes

A subject is the entity an identity statement is about. A sign-in statement might describe Maya. A protected task may instead contain information about another person. Identify the subject of each statement before equating that entity with the authenticated principal.

~~~passage
study-user
~~~
### The user is the person

Maya operates the browser. She is the human user in this scenario. The browser makes the network call on her behalf.

~~~passage
study-client
~~~
### The client sends the request

A client can be a browser, a mobile app or a scheduled exporter. Its role depends on the hop. Calling software and the person operating it may have distinct identities.

~~~passage
study-service
~~~
### A service can also act as a client

The Task API serves the browser. If the same API calls a storage service, the API is the client on that next hop. That hop has its own trust decision and can use a service identity.

## Decide access

~~~mission
decide-access
~~~

~~~passage
study-authorization
~~~
### Decide whether the caller may do this

Authorization evaluates a specific operation for the established caller. In the playground, a server-side read grant and a matching stored workspace are separate conditions. A verified caller with a create grant still fails the read check.

~~~passage
study-access-control
~~~
### Enforce the decision before data leaves

Access control combines the policy and the mechanism that enforces it. Refuse the operation before returning Task 17 when the policy denies. A hidden UI button can help navigation, but the server must still enforce access at the protected operation.

~~~passage
study-resource
~~~
### Load resource facts from trusted storage

The protected resource is the Task 17 record. Resolve its workspace from stored data in this model. Use server-established facts about the actor and their grants. The workspace selector in the playground stands in for storage, and an incoming JSON workspace is merely a claim.

### Walk through the Java policy

The pure Java policy runs after authentication. It assumes a non-null collection of trusted grants and non-null workspace values resolved by the server. Choose a check to see how the line relates to the playground. In a real application, connect the policy result to the protected operation and test that a denied request cannot read the protected data.

~~~java
import java.util.Set;

class TaskReadPolicy {
    static boolean mayRead(
            Set<String> authorities,
            String actorWorkspace,
            String taskWorkspace) {
        boolean canRead = authorities
                .contains("task:read");
        boolean inScope = taskWorkspace
                .equals(actorWorkspace);
        return canRead && inScope;
    }
}
~~~

## Trace the trust boundary

~~~mission
trace-boundary
~~~

~~~passage
study-resource-server
~~~
### The resource server owns the protected API

The resource server receives and validates evidence intended for it, then enforces resource policy. A separate issuer may supply evidence, but it does not take over the Task API’s responsibility for Task 17.

~~~passage
study-authentication-server
~~~
### Verification has an owner

An authentication server verifies proof under a configured mechanism. In a deployment, the authentication logic may live inside the application or elsewhere. The Task API can accept evidence from a trusted issuer only after validating it for this use.

~~~passage
study-identity-provider
~~~
### A provider makes an identity statement

An identity provider can authenticate a subject and issue a verifiable identity statement to a relying party. An OAuth authorization server issues access tokens for protected resources. The roles can coexist in one service, and the terms describe different responsibilities. This diagram models already-checked evidence, outside the details of how OAuth or federation carries it.

> ### Going deeper
> Compare the [OAuth 2.0 roles](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.1) with the [NIST federation model](https://pages.nist.gov/800-63-4/sp800-63c.html). In Spring, see [Servlet authentication architecture](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/architecture.html) and [request authorization](https://docs.spring.io/spring-security/reference/7.1/servlet/authorization/authorize-http-requests.html).

## Investigate the audit trail

~~~mission
attribute-request
~~~

~~~passage
study-human-to-service
~~~
### A person signs in through a client

A browser sends evidence linked to Maya’s authenticated session. The Task API uses the established human principal and checks the requested action. For support or audits, keep the user identity, client, and requested operation clear.

~~~passage
study-service-to-service
~~~
### A scheduled service establishes its own identity

The exporter runs without a human request and authenticates as its workload identity. Deploying the exporter neither grants it Maya’s permissions nor makes Maya the runtime caller. If the system supports delegation, preserve both actors and validate the delegation explicitly. The shown job runs under its own authority.

## Review the request

~~~mission
review-request
~~~

### Take the model into assessment

Trace the actual caller, the accepted evidence, the server-side action grant and the stored resource scope. Explain which stage must stop the operation and what a regression test should observe. The independent practice assessment is a separate activity.
