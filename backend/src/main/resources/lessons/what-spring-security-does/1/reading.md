## Trace a protected request

~~~mission
cross-spring-boundary
~~~

~~~passage
study-servlet-integration
~~~
### Find the container-to-Spring boundary

The Servlet container invokes its registered filters. In a typical Spring configuration, a delegating filter hands the request to Spring Security’s filter infrastructure. The selected security filters surround downstream processing. This fixture assumes the request is mapped to Spring MVC and enters that container filter. [Spring Security Servlet architecture](https://docs.spring.io/spring-security/reference/7.1/servlet/architecture.html)

~~~passage
study-before-controller
~~~
### Determine whether MVC was reached

Request-level security can stop the downstream chain. If it continues, the DispatcherServlet resolves a handler and invokes it through MVC. Confirm controller reachability with a benign test marker rather than assuming every response came from a controller. Method and domain authorization can also execute after servlet-level checks.

## Inspect identity and authority

~~~mission
inspect-spring-evidence
~~~

~~~passage
study-authentication-support
~~~
### Bind observed evidence to a principal

An authentication mechanism gathers evidence and delegates verification to configured components. For a username and password, a filter can submit an unauthenticated Authentication to an AuthenticationManager. A successful result can populate the SecurityContext. Presence of an object alone is insufficient because Spring Security can populate an anonymous Authentication.

~~~passage
study-authorization-support
~~~
### Apply a specific policy to the verified caller

Request authorization can ask an AuthorizationManager to evaluate the current Authentication and request. A required authority must use the application’s naming convention. hasAuthority checks the supplied name. A verified caller without the required authority can be denied. [Request authorization](https://docs.spring.io/spring-security/reference/7.1/servlet/authorization/authorize-http-requests.html)

### Compile the route decision against Spring Security

This isolated Java fixture supplies a verified authentication object with one named authority. The call runs the actual authorization manager. This sample does not establish an identity from incoming evidence.

~~~java
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authorization.AuthorityAuthorizationManager;
import org.springframework.security.core.authority.AuthorityUtils;

final class RouteAuthority {
    static boolean permits(String granted, String required) {
        var identity = UsernamePasswordAuthenticationToken.authenticated(
                "fixture-reviewer", null, AuthorityUtils.createAuthorityList(granted));
        return AuthorityAuthorizationManager.<String>hasAuthority(required)
                .authorize(() -> identity, "export route").isGranted();
    }
}
~~~

Try the exact required authority, a different authority, and a differently cased authority.

## Check the protection gate

~~~mission
compare-spring-protections
~~~

~~~passage
study-common-protection
~~~
### Check protection per request and setting

In the standard Servlet CSRF configuration, requests using POST and other unsafe methods are checked for a valid CSRF token. An authenticated browser session does not satisfy this separate check. Safe methods are expected to avoid state changes, so this fixture models a GET read and POST export. Protection settings and request matchers affect real deployments. Spring Security also offers session fixation protection and security headers. [CSRF reference](https://docs.spring.io/spring-security/reference/7.1/servlet/exploits/csrf.html)

## Place the domain decision

~~~mission
audit-spring-policy
~~~

~~~passage
study-business-rules
~~~
### Keep the record rule near authoritative data

A route guard may require export:read. The application still owns whether this export belongs to the caller’s workspace and whether its state allows access. Evaluate domain rules with trusted account scope and the stored object, never with a caller-provided workspace alone. Domain authorization can be implemented through a service or explicit method-security policy informed by that data.

## Review the release boundary

~~~mission
review-spring-boundary
~~~

~~~passage
study-framework-protocol
~~~
### Separate HTTP semantics from framework wiring

HTTP defines wire-level semantics. OAuth components and their interactions are defined by their specifications. Spring Security implements configured mechanisms and integrations. In a browser export application, inspect the filter boundary, the configured request policy and the service’s resource policy before attributing an outcome to the framework or to HTTP.
