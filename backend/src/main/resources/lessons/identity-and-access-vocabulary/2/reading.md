## Separate an identity from its proof

Maya opens a task dashboard to read the North workspace. An overnight exporter reads from the same workspace while she is offline. Should the audit log name Maya for both requests? Keep that question in mind as you trace the evidence each caller provides.

Prerequisites: recognize the parts of an HTTP request and read a short Java method. The examples use a fictional application and a simple policy.

~~~passage
study-identity
~~~
### Identity is who or what the system represents

The dashboard represents Maya through an account with a stable identifier. The exporter has a separate workload identity. Use the stable account identifier when comparing records across requests. A display name can change or be shared by several accounts.

~~~passage
study-credential
~~~
### A claim needs evidence

Typing a username claims an account. A password can be checked against the account’s stored password verifier. Depending on the mechanism, a workload can instead prove control of a private key. Public certificate bytes alone do not prove that control. Keep evidence out of application logs.

~~~passage
study-authentication
~~~
### Authentication checks the evidence

Authentication is the process of checking the evidence associated with a claimed identity. In this dashboard, a successful sign-in establishes the caller as Maya’s account. If the proof fails, this request cannot proceed as Maya. Subsequent requests may reuse a valid session context under the application’s configured rules.

~~~visual
claim-and-proof
~~~

~~~reader
practice
~~~

> ### Going deeper
> Application code often uses the word credentials for presented secrets or tokens. The [NIST digital identity glossary](https://pages.nist.gov/800-63-4/sp800-63.html#glossary) distinguishes the authenticator the subscriber controls from a credential that binds an identity to it. Use the language of the protocol you are describing.

## Name the actor at each boundary

~~~passage
study-principal
~~~
### A principal represents the actor after verification

After successful sign-in, the application needs an inspectable representation of its caller. Spring Security holds an `Authentication` in its security context. `getPrincipal()` provides the actor representation. `getAuthorities()` provides the associated grants. A password-based mechanism often uses a `UserDetails` principal. The declared return type is `Object`, and other mechanisms can return other types. See the [Spring Security 7.1 authentication architecture](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/architecture.html).

Spring can also represent anonymous access explicitly. A non-null authentication object alone cannot establish that a person signed in. Use the configured authorization rules to distinguish anonymous and verified callers.

~~~passage
study-subject
~~~
### The subject is who a statement describes

A statement about Maya has Maya as its subject. A statement about the exporter has the exporter as its subject. In access-policy discussions the subject is the entity being evaluated. The representation of that entity can change from a directory record to an application principal.

> ### Going deeper
> Java 25 also has a specific [JAAS Subject API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/javax/security/auth/Subject.html). A JAAS Subject can group multiple principal identities and associated credentials. Spring’s `getPrincipal()` does not promise that it returns this Java type.

~~~passage
study-user
~~~
### The user is the person in this dashboard flow

Maya is the human using the dashboard. An account represents her to the application. Some systems also call machine accounts users, so prefer “human account” or “workload account” when writing tests, debugging, or recording audit events.

~~~passage
study-client
~~~
### The client is the software sending the request

Maya’s browser is the client of the dashboard. If the dashboard calls the task API, the dashboard becomes the client of that API. The client and the person on whose behalf it may act are separate. A forwarded username alone does not establish delegated authority.

~~~passage
study-service
~~~
### A service can handle one request and make another

The task API serves tasks, while the overnight exporter calls it. The task API can in turn call a document service. Label the sender and receiver at each hop. A single deployed service can be a server on one hop and a client on the next.

~~~reader
practice
~~~

## Decide access to a specific resource

~~~passage
study-authorization
~~~
### Authorization decides whether to permit one operation

An authenticated reader requests a task. Authorization considers the actor, requested action, actual resource, and applicable scope. For this example Maya can read tasks in North. South remains outside her scope even though she is already signed in.

~~~visual
access-path
~~~

~~~passage
study-access-control
~~~
### Access control applies the rule where the data is protected

A grant such as `task:read` permits the action subject to policy. The API also enforces the scope when accessing stored tasks. Hiding a button in the dashboard changes the interface. The server still has to enforce the rule when it receives a request.

~~~passage
study-resource
~~~
### A resource is the actual target of the decision

A task, its attachment, and a workspace-filtered list can each be resources. An endpoint path identifies the operation, while the resolved target supplies facts such as workspace membership. For a specific task, obtain that workspace from storage. A value supplied in the request is insufficient to establish where that task belongs.

### Apply the two checks in Java

This method assumes a resolved task with a non-null workspace and trusted grants and membership. The method receives those facts after the application has established the actor. It makes a policy decision about reading a task.

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

~~~visual
java-walkthrough
~~~

~~~visual
policy-outcomes
~~~

~~~reader
practice
~~~

> ### Engineering tip
> When isolating a scope check, keep the authenticated actor and action grant fixed and vary only the task’s stored workspace. This separates a scope denial from an authority denial.

## Locate the trust boundaries

The same backend may verify the caller and guard the data. Treat these as responsibilities before deciding how many applications to deploy.

~~~visual
trust-path
~~~

~~~passage
study-authentication-server
~~~
### An authentication server verifies proof

In this lesson, authentication server means the component responsible for checking proof of identity. It could be part of the task application or a separate system. Diagnose an identity failure where verification happens. Diagnose an access failure where the resource policy is evaluated.

~~~passage
study-identity-provider
~~~
### An identity provider can make a trusted assertion

A trusted provider can make a statement about a subject for another service. The receiving service validates that assertion and maps the subject to its application context. The application still decides access to the particular task. The simple dashboard example can verify accounts locally.

> ### Going deeper
> In federation, a relying party accepts validated assertions from an identity provider under a configured trust relationship. If two providers use subject ID `42`, the provider and the identifier together distinguish the accounts until the application maps them to trusted local identities. See the [NIST federation guidelines](https://pages.nist.gov/800-63-4/sp800-63c.html).

~~~passage
study-resource-server
~~~
### A resource server guards the data

The task API serves protected data and enforces access before returning it. Its policy uses the verified caller plus the operation and actual resource. Trust in the caller’s identity does not establish permission to read the task.

> ### Going deeper
> In [OAuth 2.0 roles](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.1), the resource server handles requests for protected resources using access tokens and the authorization server issues those tokens. This terminology applies to that protocol. A Spring application can authenticate locally and apply resource policy without an OAuth deployment.

## Follow a person and a workload

~~~passage
study-human-to-service
~~~
### Human-to-service begins with Maya’s account

The dashboard verifies Maya’s sign-in and uses her valid session on subsequent requests in this design. When she asks to read a task, the application evaluates Maya’s grants and workspace. A service acting on her behalf needs evidence appropriate to that delegation before the downstream service relies on her identity.

~~~passage
study-service-to-service
~~~
### Service-to-service begins with the exporter’s own identity

The exporter runs unattended. It authenticates with evidence provisioned to the workload. The person who deployed it may be recorded separately for audit purposes. The deployed job’s request must be attributed to the verified workload identity unless a separately established delegation applies.

~~~visual
caller-paths
~~~

~~~reader
practice
~~~

> ### Going deeper
> One way to model an unattended OAuth client is the [client credentials grant](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.4), which is for confidential clients. A service can also identify a workload through a different mechanism, such as a verified client certificate. In both cases, choose a policy for what that caller may do.

### Trace a denied export

The nightly job stopped reading North tasks after deployment. Identify one piece of evidence to distinguish an identity failure from a missing action grant and from a resource-scope failure. Start with what the server actually established about the caller.

> ### Guided explanation
> Check whether the request established the expected workload identity. If it did, inspect the trusted grants with the target held constant. Then vary the task’s stored workspace while keeping the identity and grants fixed. These observations distinguish failed authentication, a missing action grant, and a resource-scope denial.

> ### Key takeaway
> Verify the actor at each boundary, authorize a specific action on the actual resource, and enforce that decision before returning protected data.
