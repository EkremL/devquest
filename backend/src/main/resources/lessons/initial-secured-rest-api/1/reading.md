## Build the route contract

~~~mission
build-rest-chain
~~~

~~~passage
study-add-chain
~~~
### Register the Servlet security policy

Declare a SecurityFilterChain bean built from HttpSecurity. The filter infrastructure applies it to incoming requests. This fixture uses a single chain and leaves all routes outside its explicit allowlist denied.

~~~passage
study-public-routes
~~~
### Permit only the intended public request

Match GET /api/status and apply permitAll for its minimal, non-sensitive payload. A permitAll rule lets the request remain in the security chain. It does not remove other filters.

~~~passage
study-authenticated-routes
~~~
### Require verified identity for the protected route

Apply authenticated() to GET /api/profile. The rule requires a trusted caller under Spring Security’s authentication policy. Each real endpoint may also need authority and resource checks. [Request authorization](https://docs.spring.io/spring-security/reference/7.1/servlet/authorization/authorize-http-requests.html)

## Compare three HTTP exchanges

~~~mission
send-rest-fixtures
~~~

~~~passage
study-basic-learning
~~~
### Enable the mechanism in the selected chain

httpBasic(withDefaults()) enables the configured Basic filter and entry point. The filter interprets Basic evidence and asks the authentication manager to verify it. Basic uses reversible encoding, so protect real deployments with TLS and never log or expose the header. This fixture is read-only and uses fictional identities. [HTTP Basic](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/passwords/basic.html)

~~~passage
study-call-public
~~~
### Inspect the public request without evidence

Call GET /api/status without an Authorization header in the simulator. A 200 and the public payload show that this request reached the public handler even without a verified account.

~~~passage
study-call-protected-empty
~~~
### Observe the ordinary Basic challenge

The plain fixture request to GET /api/profile has no stored context or header. The protected route returns 401 with a Basic challenge, and skips its controller. The example assumes no custom entry point or request headers that change the default challenge behavior.

## Inspect the accepted result

~~~mission
inspect-rest-caller
~~~

~~~passage
study-inspect-principal
~~~
### Use framework-provided identity in the handler

A Spring MVC controller can receive an Authentication and read getName() and getAuthorities(). The principal type depends on the configured mechanism. Return only fields needed by the client and keep credentials and stored password representations out of the response.

## Follow authentication and dispatch

~~~mission
trace-rest-chain
~~~

~~~passage
study-call-protected-valid
~~~
### Observe a verified request reach the same handler

Repeat the fictional profile request with accepted Basic evidence. A 200 and the expected principal show that the configured authentication and authorization path continued. Use fixed fake evidence in local tests.

### Build the route policy in Java

The configuration assumes MVC and a fixture UserDetailsService and password encoder supplied by the test context. The example keeps CSRF defaults and exposes two GET routes.

~~~java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration(proxyBeanMethods = false)
@EnableWebSecurity
class InitialRestSecurity {
    @Bean
    SecurityFilterChain api(HttpSecurity http) throws Exception {
        return http
                .authorizeHttpRequests(routes -> routes
                        .requestMatchers(HttpMethod.GET, "/api/status").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/profile").authenticated()
                        .anyRequest().denyAll())
                .httpBasic(withDefaults())
                .build();
    }
}
~~~

Check public GET, anonymous protected GET, valid protected GET and a route omitted from the allowlist with in-process MVC requests.

## Approve the initial release

~~~mission
review-rest-release
~~~

~~~passage
study-complete-flow
~~~
### Locate the decision that explains the response

Follow BasicAuthenticationFilter to the authentication manager and then to the context used by request authorization. When the protected gate passes, MVC reaches the profile controller. A missing header follows the chain without running credential verification, and a protected unauthenticated request is challenged. Session 2.6 explores how the challenge and access-denied handlers produce different responses.
