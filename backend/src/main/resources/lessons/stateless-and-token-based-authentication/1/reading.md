## Dispatch the evidence

~~~mission
dispatch-token-pair
~~~

~~~passage
study-stateless-request
~~~
### Authenticate each request on its own evidence

An instance can authenticate this request without recalling an earlier login session on that instance. The API still has business records and trusted configuration. Whether the verifier calls another service is a separate design choice.

~~~passage
study-access
~~~
### Access evidence belongs at the resource

An access token represents a grant with a purpose and lifetime. Present it to the intended protected resource, typically in the Bearer Authorization field for this API. Protect it in transit and avoid logging its value.

~~~passage
study-refresh
~~~
### Refresh evidence belongs at the issuer

The client presents a refresh token to the issuer to request new access evidence. Its lifetime and revocation rules can differ from those of an access token. A resource cannot substitute it for the access evidence it expects. [OAuth token roles](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.4)

~~~passage
study-issuance
~~~
### The issuer binds evidence to an approved grant

The issuer checks the client and approved authorization under the configured flow. It issues evidence for the intended audience or resource and allowed scope. A working network request does not authorize wider issuance.

## Check format and time

~~~mission
validate-token-window
~~~

~~~passage
study-opaque
~~~
### Resolve an opaque reference through trusted state

The API treats the handle as an uninterpreted reference. Its appearance cannot tell the API whether it is valid. A trusted lookup can provide current status and applicable grant metadata.

~~~passage
study-self-contained
~~~
### Verify self-contained evidence locally when policy permits

A protected envelope can carry claims for local validation with trusted keys and configuration. A signed envelope is not necessarily confidential. Some systems still consult live policy or revocation even after local validation.

~~~passage
study-validation
~~~
### Bind validation to the target

Check the evidence mechanism, trusted issuer, intended resource, time and relevant policy requirements. Establish the caller or grant first. Apply action and resource authorization separately. [Bearer usage](https://www.rfc-editor.org/rfc/rfc6750.html)

~~~passage
study-expiration
~~~
### Reject at the exclusive expiry instant

The bench uses no clock leeway and minute five is already expired. This Java function addresses only time eligibility after trustworthy timestamps have been obtained.

~~~java
import java.time.Instant;

class AccessWindow {
    static boolean active(Instant now, Instant expiresAt) {
        return now.isBefore(expiresAt);
    }
}
~~~

## Trace grant withdrawal

~~~mission
compare-token-revocation
~~~

~~~passage
study-revocation
~~~
### Revocation can occur before expiry

Revocation changes what an authority accepts before the scheduled deadline. Cancellation at an issuer does not reach a local-only verifier automatically. Short lifetimes bound that window. Immediate withdrawal requires current authoritative state on the affected access path. [Token revocation](https://www.rfc-editor.org/rfc/rfc7009.html)

~~~passage
study-introspection
~~~
### Distinguish an inactive answer from no answer

An authenticated introspection call can ask an authorization server for current token metadata, including active status. This example assumes fresh lookups and no cache. Inactive is a result. An outage leaves the result unknown. [Token introspection](https://www.rfc-editor.org/rfc/rfc7662.html)

## Inspect refresh rotation

~~~mission
rotate-refresh-family
~~~

~~~passage
study-rotation
~~~
### Rotate refresh handles at the issuer

A successful exchange issues a replacement and retires the old refresh handle. The issuer tracks the family in this model. Response loss and concurrent refreshes matter because an exchange may commit before the client observes it.

~~~passage
study-replay
~~~
### Treat an unexpected reuse as defensive evidence

Bearer evidence can be reused while it remains valid. Rotation lets this issuer detect reuse of a retired refresh handle and close the family. It does not undo valid access already granted or stop a separate local verifier. Prevent exposure and follow the configured incident policy. [OAuth security best current practice](https://www.rfc-editor.org/rfc/rfc9700.html)

## Meet the withdrawal guarantee

~~~mission
resolve-token-contract
~~~

~~~passage
study-state-boundaries
~~~
### Name where each kind of state lives

A token can remove dependence on a local login session while the issuer still stores grants, the API holds trusted keys, and a resource verifier checks current state. Choose the model based on withdrawal and availability requirements. Use the independent assessment to defend your choice.
