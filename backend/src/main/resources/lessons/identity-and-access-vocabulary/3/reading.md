## Separate an identity from its proof

At 02:13, Maya is asleep. The audit dashboard shows her name on a task read. Did the application verify Maya, did a job act on her behalf, or did the dashboard confuse two events? Start with the evidence you have.

~~~visual
overnight-trace
~~~

All records in this lesson are illustrative. You only need to follow a request and read a short Java method.

~~~passage
study-identity
~~~
### Start with who the system represents

Maya has a human account. The exporter has a workload account. Each is a separate identity in the task system. Use the stable account identifier to correlate requests. Display names can change and can be shared.

~~~passage
study-credential
~~~
### A username alone proves nothing

A claimed account name tells the verifier which account to look up. A password gives it evidence to check against the account’s stored verifier. A workload could instead prove control of a private key. A public certificate by itself does not demonstrate that control.

~~~reader
practice
~~~

~~~passage
study-authentication
~~~
### Mark the point where the claim becomes trusted

Authentication verifies the evidence under the application’s rules. When sign-in succeeds, this dashboard can establish Maya’s account as its authenticated caller. A valid session can carry that context to later requests in this design. If proof fails, the request cannot proceed as Maya.

> ### Going deeper
> Application code often calls passwords or tokens credentials. The [NIST digital identity glossary](https://pages.nist.gov/800-63-4/sp800-63.html#glossary) distinguishes an authenticator from a credential that binds an identity to it. Use the protocol’s terminology when describing what was checked.

## Name the actor at each boundary

Maya clicks a button. The browser sends a request. The dashboard may then call the task API. Pause before labelling all three as “the user.”

~~~visual
role-contrast
~~~

~~~passage
study-principal
~~~
### Open the security context

A principal is the application’s representation of the actor for an authenticated interaction. In Spring Security, the security context holds an `Authentication`. `getPrincipal()` exposes the representation, and `getAuthorities()` exposes its associated grants. A username/password mechanism commonly returns a `UserDetails` principal, but its declared type is `Object`. See the [Spring Security 7.1 authentication architecture](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/architecture.html).

> ### Common misconception
> Spring Security can represent anonymous access explicitly. A non-null authentication object alone does not establish a verified human account. Use the configured authorization rules to distinguish anonymous and verified callers.

~~~passage
study-subject
~~~
### Find the subject of the statement

Ask “Who does this statement describe?” A statement about Maya’s sign-in and a statement about the exporter’s runtime identity have different subjects. In access policy, subject commonly means the actor being evaluated.

> ### Going deeper
> Java 25’s [JAAS Subject API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/javax/security/auth/Subject.html) can group principal identities and their credentials. It has its own contract and is not the declared return type of Spring’s `getPrincipal()`.

~~~passage
study-user
~~~
### Name the person

Maya is the user at the dashboard. Her account represents her in the system. Use “human account” or “workload account” in debugging notes when “user” could refer to either.

~~~passage
study-client
~~~
### Name the sender on this hop

The browser is the dashboard’s client. When the dashboard calls the task API, the dashboard becomes that API’s client. A client can act on behalf of a subject only when the receiving service has appropriate evidence of delegation.

~~~passage
study-service
~~~
### Follow the service to its next hop

The task API is a service exposing resources. It may also become a client when it requests an attachment from a document service. “Service” identifies the workload. “Client” and “server” describe its role in a particular exchange.

~~~reader
practice
~~~

> ### Debugger mindset
> Separate the request ID, the stage, and the outcome. Add an actor identifier only once you know what it represents and policy permits logging it. Keep raw passwords, session identifiers, and access tokens out of diagnostic output.

## Decide access to a specific resource

~~~passage
study-authorization
~~~
### Make a decision for one operation

Maya has signed in and requests Task 17. Authorization asks whether this actor can perform this action on this resource under the applicable scope. Being a verified reader answers only part of that question.

~~~visual
access-path
~~~

~~~passage
study-access-control
~~~
### Enforce the decision at the data boundary

Access control puts policy into effect. The API must enforce the workspace rule before returning protected data. Disabling a button can guide the reader but cannot enforce the API decision.

~~~passage
study-resource
~~~
### Load the resource facts from storage

Task 17, its attachment, and a filtered task collection are different resources. For an individual task, use its stored workspace when deciding scope. A workspace supplied by the client does not establish where the stored task belongs.

### Read the policy like a test

The method below assumes a resolved task with a non-null workspace. Authorities and membership come from trusted actor data. The task’s workspace comes from storage. First read `canRead` as the action check, then `inScope` as the resource check. Both must pass.

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

~~~reader
practice
~~~

> ### Debugger mindset
> Fix the test input before changing policy. Hold the verified actor and read grant constant while moving only the task to South. If the result flips, you isolated the scope check. Widening permissions would obscure what you learned.

## Locate the trust boundaries

The team wants to move sign-in into a separate application. Before drawing boxes for deployments, trace which responsibilities must exist wherever the code runs.

~~~visual
trust-path
~~~

~~~passage
study-authentication-server
~~~
### Find who verifies

An authentication server checks proof of identity. That role can live inside the application or in a separate service. For failed proof, start at the verifier. Check which validator ran and its outcome without inspecting or recording the secret itself.

~~~passage
study-identity-provider
~~~
### Find who asserts

An identity provider can make a statement about a subject for another application. The receiving application validates that assertion and maps it into its own security context. The dashboard in the plain example can check proof locally.

> ### Going deeper
> In federation, the relying party validates the assertion under a configured trust relationship. When two providers use the same subject identifier, keep the issuer and subject together until the application maps them to a trusted local account. See the [NIST federation guidelines](https://pages.nist.gov/800-63-4/sp800-63c.html).

~~~passage
study-resource-server
~~~
### Find who evaluates and enforces

The task API protects the resource. It evaluates the operation using actor and resource facts, then enforces that decision before reading or returning protected data. A trusted assertion can establish an actor while policy still denies that actor the operation.

~~~reader
practice
~~~

> ### Going deeper
> In [OAuth 2.0 roles](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.1), a resource server handles protected resource requests using access tokens and an authorization server issues those tokens. These are protocol roles. A local Spring application can authenticate its callers and enforce task access without deploying OAuth.

## Follow a person and a workload

Return to the 02:13 request. The deployment and the read are separate events. What can each one prove about the actor?

~~~passage
study-human-to-service
~~~
### A human request carries the person’s context

Maya signs in to the dashboard. On a later task read, her valid session supplies the context and policy checks the operation against her grants and workspace. A downstream service relying on her identity needs appropriate evidence for that delegation.

~~~passage
study-service-to-service
~~~
### A workload proves its own identity

The exporter runs while Maya is offline. It presents its own proof when calling the task API. The person who deployed it is the deployment actor. The verified exporter is the runtime actor for this read.

~~~reader
practice
~~~

~~~visual
runtime-trace
~~~

### Bring the incident back to the code

In this fictional incident the audit view copied the deployment actor into the runtime actor field. The authentication and read policy could both have worked correctly. The reporting bug was a mix-up between events. A regression test can fix the two actor IDs and verify the audit view keeps them separate.

> ### Going deeper
> An unattended OAuth client may use the [client credentials grant](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.4), which is for confidential clients. A client certificate is another way to identify a workload. In either case the application still needs a policy for the requested operation.

> ### Key takeaway
> Trace the caller, the proof, the requested action, the actual resource and the enforcement point. When a request is denied, identify which of those facts failed before changing any permission.
