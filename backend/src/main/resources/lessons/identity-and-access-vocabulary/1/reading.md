## Separate an identity from its proof

A task dashboard lets Maya read tasks in the North workspace. An overnight export service also reads North tasks, but no person is present when it runs. The team wants an audit trail that can distinguish the two callers and a rule that denies either caller access to the South workspace. Start by following the identity, the evidence, and the requested action separately.

Prerequisites: be comfortable reading a short Java method and recognizing the parts of an HTTP request. Module 0 establishes the project and toolchain. No prior knowledge of OAuth, tokens, or Spring Security filters is required.

~~~passage
study-identity
~~~
### Identity in a system

An identity is the representation a system uses for an actor. Maya is the person. A directory account represents her to the dashboard. The exporter has a different identity in the same environment even if Maya deployed it. A display name can change or match another person's name. Use the stable identifier in its identity namespace when you need to distinguish records across requests.

If two trusted providers both identify a subject as `42`, the value alone is ambiguous. In a system that accepts both, an issuer and its subject ID together can identify the record. The policy should use that identifier or a trusted mapping from it. A username copied from a request body is only a claim.

~~~passage
study-credential
~~~
### A credential supports a claim

A caller supplies evidence that a verifier can check. An account name identifies the account to look up. A password proves knowledge of a secret when checked against that account's verifier. A certificate can bind an identity or name to a public key, but a client must also demonstrate control of the corresponding private key in a protocol such as mutual TLS. Merely presenting public certificate bytes is insufficient.

In everyday application code, developers often call passwords or tokens credentials. The [NIST digital identity glossary](https://pages.nist.gov/800-63-4/sp800-63.html#glossary) distinguishes an authenticator, which the subscriber controls, from a credential that binds an identity to that authenticator. Be explicit about whether you mean evidence, an account record, or a secret. None of those distinctions requires logging the evidence itself.

~~~passage
study-authentication
~~~
### Authentication verifies the claimed actor

Authentication turns a claim into a security context the application can rely on within that protocol's trust assumptions. A verifier checks the evidence and its relationship to the claimed actor. An unsuccessful verification produces no authenticated actor for that request. A pre-existing session can supply context on later requests if the application validates that session. Whether authentication is repeated on each request depends on the mechanism and configuration.

Trace an unfamiliar sign-in flow by asking where the evidence arrives, which component validates it, and where the resulting caller identity becomes available. Stop there before asking whether the caller may read a task.

~~~text
Claimed account + evidence → verification → authenticated actor
Authenticated actor + action + resource → policy decision
Policy decision → enforcement at the resource boundary
~~~

> ### Key takeaway
> An identifier tells you which actor is being claimed. Verified evidence establishes the caller for this context. Neither step grants access to a specific task.

## Decide access to a specific resource

~~~passage
study-authorization
~~~
### Authorization answers a narrower question

The question is whether this actor can perform this action on this resource in this context. Maya's permissions may allow reading North tasks and disallow editing them. The exporter might have a read permission of its own. A successful authentication event answers none of those policy questions. Use the same distinction when debugging a denial: first establish whether verification succeeded, then inspect the authorization inputs.

~~~passage
study-access-control
~~~
### Access control connects policy to enforcement

Access control includes the rules and the mechanisms that apply them. An authority such as `task:read` is an input. The endpoint must also enforce the applicable workspace boundary before returning the protected data. Hiding a button makes the interface clearer, while the server still needs to enforce access when a request reaches it.

The following plain Java example isolates the policy decision. Assume that `authorities` and `actorWorkspace` come from trusted authentication and membership data, and `taskWorkspace` comes from the stored task. None comes directly from a caller-supplied form field. A real data query could enforce the same workspace constraint while fetching the resource.

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

With `Set.of("task:read")`, North and North produce `true`. Change only the task workspace to South and the answer is `false`. Keep both workspaces North and pass `Set.of("task:create")`; the answer is also `false`, for a different reason. The method assumes a resolved task with a non-null workspace and does not authenticate anyone.

~~~passage
study-resource
~~~
### The resource is what policy protects

The route pattern identifies a kind of operation. The resource might be an individual task, a file attached to it, or a filtered collection of tasks. A rule that authorizes reading task 17 does not automatically authorize reading task 18. Resolve the target using trusted storage or enforce the scope in the lookup. Comparing two workspace values supplied by the caller would make the check meaningless.

~~~reader
practice
~~~

> ### Engineering tip
> In a regression test, hold the authenticated actor and authority constant and change only the task's persisted workspace. That isolates a resource-scope check from authentication and authority mapping.

## Name the actor at each boundary

~~~passage
study-principal
~~~
### Principal is the actor representation in a security context

In Spring Security, `Authentication.getPrincipal()` returns the principal as an `Object`. Its concrete type depends on how authentication was established. A username/password flow commonly carries a `UserDetails`; code that unconditionally casts to that type may fail after the mechanism changes. The authorities are available through `Authentication.getAuthorities()` and are distinct from the principal. The [Spring Security 7.1 authentication architecture](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/architecture.html) describes both the authentication input and the successful context.

A non-null `Authentication` alone is insufficient evidence of a signed-in human. Spring Security can represent anonymous access explicitly. Let the configured authorization mechanism distinguish anonymous and authenticated callers rather than inferring identity from object presence.

~~~passage
study-subject
~~~
### Subject is the entity represented in a security statement

Read the term in context. In a provider's assertion, a subject is the entity the statement describes. In a policy discussion, subject often means the actor whose access is being evaluated. Java's [JAAS Subject API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/javax/security/auth/Subject.html) has a more specific meaning: an instance can group multiple `Principal` identities and credentials. That Java type is separate from the principal object returned by a Spring Security authentication mechanism.

When tracing the dashboard request, record what each identity value represents before comparing values. An external subject identifier and a local account ID may refer to the same person through an explicit mapping. They need not have the same string value.

~~~passage
study-user
~~~
### User is the person in the dashboard flow

Here the user is Maya, represented by an account. The account has an identifier and attributes used by the application. Other documentation may call any account a user, including a service account. In tests and audit messages, say whether you mean a human account or a workload account. That distinction affects how credentials are issued and what activity belongs to that identity.

~~~passage
study-client
~~~
### Client is the software making the request

Maya's browser can act as the HTTP client when it sends a task request. If a backend dashboard sends a downstream request, the dashboard is the client at that next boundary. The client can act on behalf of a person or as itself. Identify the client and the subject separately when both matter. The system must have trusted evidence for delegation before it attributes an operation to the person.

~~~passage
study-service
~~~
### Service is a workload that serves or calls another component

The task API is a service that offers resources. The exporter is a workload that calls it. If the task API queries a document service, it can be a server at one boundary and a client at the next. Give workloads distinct identities and avoid borrowing a human account for a scheduled process. Deployment ownership is useful audit context, but the authenticated workload remains the actor on its own request.

> ### Common misconception
> A service, a client, and a principal are descriptions at different levels. The export service is the client on this request. Its verified workload identity is what the backend represents as the principal.

## Locate the trust boundaries

~~~passage
study-resource-server
~~~
### A resource server protects the data

The task API is responsible for deciding whether to return a protected task. In OAuth terminology, a resource server hosts protected resources and handles requests using access tokens. It must rely on the configured evidence-validation mechanism and enforce its own access policy, including the resource's workspace. Receiving a token from a known component does not prove every operation on every task is permitted. The [OAuth 2.0 roles specification](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.1) describes how the resource server and client roles fit together.

~~~passage
study-authentication-server
~~~
### An authentication server verifies evidence

Use authentication server here for the component that checks the proof of identity. This role can be inside an application or provided by a dedicated system. In OAuth, authorization server is the protocol term for the component that issues access tokens to clients. A single deployment may perform both roles. Distinguishing them helps you find the right code or logs when a sign-in works but task access fails.

~~~passage
study-identity-provider
~~~
### An identity provider makes a trusted identity statement

In federation, the identity provider gives a relying party an assertion about a subject. The relying party validates that assertion in its own trust configuration and maps the subject where appropriate. An identity provider may authenticate the person itself or participate in a larger system that does. The task API still owns the decision to return a particular task. The [NIST federation guidelines](https://pages.nist.gov/800-63-4/sp800-63c.html) explain the identity provider and relying party roles.

> ### Key takeaway
> Draw responsibility boundaries before drawing boxes for products. Establish who verifies proof, who makes an assertion, who validates it, and who enforces access to the resource. Multiple responsibilities can live in one deployed system.

## Follow a person and a workload

~~~passage
study-human-to-service
~~~
### Human-to-service begins with a person

Maya signs in through a dashboard. The application establishes an authenticated context for her, then the task API considers the read request under the policy. In a session-based design the browser can present a session identifier on later requests. If the dashboard delegates to another service, the downstream service needs appropriate evidence for any user context it relies on. A user ID forwarded in ordinary JSON is not proof of delegation.

Debug a report that Maya can open North tasks but cannot open one in South. Determine which caller the application established, then inspect the requested action, mapped authorities and stored task workspace. If the workspace rule explains the result, asking Maya to sign in again or granting a wider role would miss the cause.

~~~passage
study-service-to-service
~~~
### Service-to-service begins with the calling workload

The overnight exporter runs without Maya's browser. It can authenticate with its workload identity and receive credentials suitable for that relationship. In an OAuth deployment, the [client credentials grant](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.4) is one way a confidential client can act on its own behalf. Another deployment may identify the workload using a client certificate. The identity mechanism and the allowed actions remain separate decisions. Keep test cases for similar actions by both human and workload identities, because each can have different scope.

~~~reader
practice
~~~

### Technical recap

Explain one successful read and one denied read in this order: caller, verified evidence, trusted identity, requested action, protected resource, policy input and enforcement point. Then repeat the explanation for the scheduled exporter. If the explanations sound identical, locate where the identity for each flow actually came from.

For a short debugging exercise, assume the exporter lost access to North tasks after a deployment. Decide what evidence separates failed authentication, missing `task:read`, and a changed resource scope. Explain one observation or regression test for each case before revealing the guidance.

> ### Guided explanation
> A failed identity check leaves no verified workload identity. A policy denial with a resolved workload identity can be isolated by holding the resource fixed and checking the required authority. A scope denial can be isolated by holding the identity and authority fixed while varying the stored task workspace. Record outcomes and non-secret identifiers in a test environment.

> ### Key takeaway
> Follow the evidence across each boundary, name the actor for that hop, and evaluate the requested action against the actual resource. Those three habits make later Spring Security configuration and debugging much easier to reason about.
