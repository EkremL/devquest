## Route the incoming token

~~~mission
route-auth-provider
~~~

~~~passage
study-authentication-manager
~~~
### Receive evidence through one callable contract

A filter or other caller converts input to an Authentication and calls authenticate. The manager returns a successful Authentication or raises an AuthenticationException. It does not itself install the returned result in the holder. In a Servlet flow that placement belongs to the authentication integration.

~~~passage
study-provider-manager
~~~
### Follow the ordered candidates

This manager tests supports on configured providers in order. A non-null result ends the search. A null result means that provider declined to decide. Without a parent or recorded failure, no result yields ProviderNotFoundException. A later success can supersede ordinary failures, but AccountStatusException and InternalAuthenticationServiceException stop the search in Spring Security 7.1.0.

~~~passage
study-authentication-provider
~~~
### Separate support from verification

supports receives the Authentication class, so it can tell whether the provider can consider that type. The authenticate call sees the actual object and performs verification or declines. A true supports result does not authenticate evidence.

~~~passage
study-multiple-mechanisms
~~~
### Route by the type created by the integration

In this fixture a password filter creates a UsernamePasswordAuthenticationToken, while a resource-server integration passes a bearer-token type to a JWT provider. Do not route using a caller-asserted provider name. Different chains can also use different managers. The route simulation does not validate credentials or decode JWTs. [Authentication architecture](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/architecture.html)

## Inspect the account projection

~~~mission
inspect-provider-account
~~~

~~~passage
study-user-details
~~~
### Inspect the account record before verification

UserDetails supplies a username, stored password representation when relevant, authorities and account-state properties. It is an account snapshot and may become the principal of a successful result, depending on provider configuration. Finding it does not establish a verified caller.

~~~passage
study-user-details-service
~~~
### Load by username through a narrow contract

loadUserByUsername retrieves an account projection or throws UsernameNotFoundException. DaoAuthenticationProvider uses this service and performs checks itself. The service should not make a successful authentication decision merely because a row exists.

~~~passage
study-granted-authority
~~~
### Map grants from the trusted account store

Authorities are capabilities consumed by authorization. In a DAO-backed flow the configured user service typically supplies them, and provider behavior or mapping can add to them. Spring Security 7.1 supplies a password-factor authority in the DAO flow. Exact returned authorities depend on configuration. Raw request fields do not grant permissions.

## Check proof against the stored representation

~~~mission
compare-provider-proof
~~~

~~~passage
study-password-encoder
~~~
### Use matches against the stored representation

matches receives the submitted password and the encoded value. Do not re-encode and compare strings because fresh salts can produce different encodings for the same input. A one-way password encoder has no decryption step. Do not log either argument. The browser compares labeled fixtures only. [Password storage](https://docs.spring.io/spring-security/reference/7.1/features/authentication/password-storage.html)

### Run an isolated DAO check with the installed Spring version

This example asks the configured provider to compare one fictional password and perform account checks. The identity object, hash, manager and encoder live only in this Java process.

~~~java
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

final class FixtureDaoLogin {
    static Authentication authenticate(String name, String presented, boolean locked) {
        var encoder = new BCryptPasswordEncoder();
        var provider = new DaoAuthenticationProvider(username -> {
            if (!"fixture-user".equals(username)) {
                throw new UsernameNotFoundException("No matching fixture");
            }
            return User.withUsername(username)
                    .password(encoder.encode("fixture-pass"))
                    .accountLocked(locked).authorities("report:read").build();
        });
        provider.setPasswordEncoder(encoder);
        return new ProviderManager(provider).authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(name, presented));
    }
}
~~~

The fixture generates a fresh test hash to avoid carrying saved credentials. A real account loader retrieves a stored representation. Test a matching password, a mismatch, an unknown account and a matching password on a locked account.

## Inspect the terminal outcome

~~~mission
trace-provider-result
~~~

~~~passage
study-account-status
~~~
### Separate account eligibility from proof

In the configured DAO path, locked, disabled and account-expired checks are distinct from password matching. Credential expiry can also prevent a successful result. Do not assume every provider checks the same account properties. A filter should map sensitive failure details to a consistent public contract.

~~~passage
study-success
~~~
### Inspect the returned object before applying permission

A successful manager call returns trusted Authentication. By default ProviderManager erases credentials on a returned object implementing CredentialsContainer. The caller installs the result where required and separately handles persistence and authorization. [DAO authentication provider](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/passwords/dao-authentication-provider.html)

## Validate the provider release

~~~mission
review-provider-wiring
~~~

~~~passage
study-failure
~~~
### Keep a failure from establishing a principal

Unsupported input, mismatched proof and account rejection can cause different internal exceptions. Never convert a failed attempt into an authenticated result. The Servlet integration may clear its current context and pass the error to configured failure handling. Correlate failure reason safely for diagnosis and avoid exposing whether a particular account exists.
