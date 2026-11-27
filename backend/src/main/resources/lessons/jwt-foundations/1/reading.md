## Inspect the envelope

~~~mission
inspect-jwt-envelope
~~~

~~~passage
study-jwt-header
~~~
### Separate protection metadata from policy

A signed compact JWT has an encoded header, an encoded payload and signature or MAC bytes. Its header identifies protection metadata such as `alg` and may declare a type. Treat incoming metadata as untrusted. The receiver still defines which token profile it accepts.

~~~passage
study-jwt-payload
~~~
### The payload carries JSON claims

The payload represents statements about the subject, token and context. It can be displayed before verification. Display does not authorize using a claim in a security decision.

~~~passage
study-jwt-signature
~~~
### Verify integrity over the signed input

The signed compact format protects the encoded header and payload together. Verification under the expected algorithm and trusted key detects unauthorized changes to that protected input. An integrity result does not check expiry, intended recipient or permission. [JWT format](https://www.rfc-editor.org/rfc/rfc7519.html)

~~~passage
study-signing-and-encryption
~~~
### Choose confidentiality separately

Signing or a MAC provides evidence of integrity and provenance in its trust model. Encryption can conceal claims from readers without the decryption key. A compact encrypted JWT uses a different structure. The receiver must enforce the protection profile it expects.

~~~passage
study-payload-readability
~~~
### Base64url is reversible encoding

A signed compact payload is generally readable without a key. Keep unnecessary secrets and private data out of it. HTTPS protects the connection, while token confidentiality and storage need their own decisions.

## Probe the claims

~~~mission
evaluate-jwt-claims
~~~

~~~passage
study-claims
~~~
### Claims are statements to validate

A claim makes an assertion. An application can use it only after validating integrity and applicability under its trusted configuration. Separate token validation from action and resource authorization.

~~~passage
study-registered-claims
~~~
### A token profile decides which claims are required

Registered names have standard meanings. The JWT format alone does not require every registered claim. The API profile determines which claims must be present and how it validates them.

~~~passage
study-subject
~~~
### Read the subject in issuer context

`sub` identifies the subject described by the token. Use the validated issuer and subject together when subject identifiers are scoped to an issuer.

~~~passage
study-issued-at
~~~
### Issue time records when the token was created

`iat` is an issuance timestamp. An application may apply an explicit token-age policy. Issue time and the first allowed use are separate.

~~~passage
study-expires
~~~
### Expiry is an exclusive boundary

`exp` is the deadline on or after which the verifier must stop accepting the token. This bench uses NumericDate seconds and zero leeway.

~~~passage
study-not-before
~~~
### Not-before sets the lower boundary

`nbf` prevents acceptance before the specified instant. Under this fixture, a token can become time-eligible at exactly that instant.

~~~passage
study-issuer
~~~
### Check the expected issuer

`iss` names the issuer. Compare it with trusted configuration and bind key selection to the configured issuer and token profile.

~~~passage
study-audience
~~~
### Check the intended recipient

`aud` can contain one audience or a list. An API that requires an audience should validate that it is among the intended recipients. An accepted issuer can still issue evidence for a different resource.

~~~passage
study-expired
~~~
### React to expiry before protected work

The pure Java example evaluates exact time eligibility after trust and presence checks. It assumes valid timestamps and intentionally models zero leeway. Production validators may apply an explicit clock-skew tolerance.

~~~java
import java.time.Instant;

class ClaimWindow {
    static boolean usable(Instant now, Instant notBefore, Instant expiresAt) {
        return !now.isBefore(notBefore) && now.isBefore(expiresAt);
    }
}
~~~

## Compare key boundaries

~~~mission
compare-jwt-keys
~~~

~~~passage
study-symmetric
~~~
### HMAC uses a shared secret

The same secret is used to create and verify the MAC. Every holder with access to that secret can generate authenticators. Include all holders in the signing trust boundary and protect key distribution.

~~~passage
study-asymmetric
~~~
### Give the verifier only public verification material

The issuer signs with its private key. The receiver verifies with the matching trusted public key under the configured algorithm. Public distribution does not make arbitrary incoming keys trustworthy.

## Run the strict verifier

~~~mission
verify-jwt-policy
~~~

~~~passage
study-algorithm
~~~
### Select the accepted profile from trusted configuration

Configure allowed algorithms for this token type and use trusted keys for that profile. The incoming header declares how the sender protected the token. It cannot widen the receiver’s expected algorithm set.

~~~passage
study-invalid-signature
~~~
### A failed integrity check stops authentication

Discard the token as evidence if verification fails. Its visible subject and claims remain untrusted. In Spring Security 7.1, the resource server’s JWT decoder and validators are the relevant configuration surface. [Spring Security JWT resource server](https://docs.spring.io/spring-security/reference/7.1/servlet/oauth2/resource-server/jwt.html)

~~~passage
study-algorithm-confusion
~~~
### Prevent the token from redefining how it is verified

Keep algorithm selection and key purpose tied to server-side policy. Reject unexpected algorithm or key-type combinations and keep validation rules distinct for different token types. [JWT best current practice](https://www.rfc-editor.org/rfc/rfc8725.html)

## Review the portal design

~~~mission
review-jwt-architecture
~~~

~~~passage
study-jwt-or-session
~~~
### Choose an architecture for its actual guarantees

A shared session can make invalidation visible on the next lookup. Local JWT validation can avoid a session lookup but can continue to accept otherwise valid evidence until expiry unless current state is consulted. Consider withdrawal, issuer trust, key rotation, confidentiality and operations. Use the independent assessment to justify a choice in a different context.
