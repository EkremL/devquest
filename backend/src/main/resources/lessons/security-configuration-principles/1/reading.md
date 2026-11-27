## Review the rule stack

~~~mission
audit-config-order
~~~

~~~passage
study-lambda-config
~~~
### Read each lambda as a configuration boundary

Spring Security 7 configuration uses customizers such as authorizeHttpRequests(rules -> ...), withDefaults() for a default configuration and an explicit SecurityFilterChain bean. Read each customizer’s scope before carrying assumptions across DSL calls.

~~~passage
study-matcher-order
~~~
### Find the first matching authorization rule

Within a selected chain, request authorization applies the first matching rule. Put narrowly scoped exceptions before broader rules. Keep this distinct from ordering multiple SecurityFilterChain beans, which determines the active filter list before request authorization. [Request authorization](https://docs.spring.io/spring-security/reference/7.1/servlet/authorization/authorize-http-requests.html)

## Check the policy boundary

~~~mission
probe-config-inventory
~~~

~~~passage
study-deny-default
~~~
### Give unknown routes a reviewed outcome

End a reviewed allowlist with anyRequest().denyAll() where a catch-all chain owns unmatched requests. If multiple chains exist, verify that some chain actually covers the remaining requests. A fallback rule inside an excluded chain cannot protect requests outside that chain.

~~~passage
study-public-endpoints
~~~
### Verify the public exception at method and path boundaries

Name the public method and path precisely, inventory actual controller mappings and include a sibling route, a different method and an unlisted route in review. Test that the public endpoint exposes only the intended payload. Denial before the authorization rule, such as CSRF rejection, does not independently prove the rule is correct.

## Compare identity continuity

~~~mission
compare-config-context
~~~

~~~passage
study-stateless-session
~~~
### Separate request-scoped identity and cross-request persistence

With SessionCreationPolicy.STATELESS, Spring Security does not use an HTTP session to obtain the security context. The holder can still represent identity during the current request. A session-backed flow can restore an explicitly saved context from a configured repository. IF_REQUIRED permits a session when needed. Other components can still use sessions under a stateless security policy. [Session management](https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/session-management.html)

## Separate the browser gates

~~~mission
compare-config-browser
~~~

~~~passage
study-csrf-defaults
~~~
### Explain the default unsafe-method check

Spring Security normally applies CSRF checks to unsafe methods such as POST. Cookie-backed authentication can be attached by a browser automatically. Statelessness alone does not remove CSRF risk when the browser automatically supplies credentials. Keep the default for this fixture.

~~~passage
study-cors-placement
~~~
### Process preflight before the authenticated route

A browser preflight describes the intended origin, method and headers. It does not carry the user’s session cookie. Evaluate allowed origin and method before the protected request policy, then independently evaluate identity and CSRF on the actual request. CORS governs browser access and is not a replacement for authorization. [CORS](https://docs.spring.io/spring-security/reference/7.1/servlet/integrations/cors.html)

### Compile a narrow configuration against Spring Security 7.1

This in-process configuration expects a fixture account service and MVC. Basic provides a test mechanism. The CORS source is explicit, the default CSRF check remains enabled, and the stateless policy addresses security-context storage.

~~~java
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration(proxyBeanMethods = false)
@EnableWebSecurity
class ReviewedApiSecurity {
    @Bean
    SecurityFilterChain api(HttpSecurity http) throws Exception {
        var cors = new CorsConfiguration();
        cors.setAllowedOrigins(List.of("https://portal.example.test"));
        cors.setAllowedMethods(List.of("GET", "POST"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-CSRF-TOKEN"));
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cors);

        return http.cors(config -> config.configurationSource(source))
                .csrf(withDefaults())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(routes -> routes
                        .requestMatchers(HttpMethod.GET, "/api/status").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/profile").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/reports").authenticated()
                        .anyRequest().denyAll())
                .httpBasic(withDefaults())
                .build();
    }
}
~~~

Use in-process tests for a permitted preflight, a refused origin, a protected GET without evidence, and a POST rejected for missing CSRF evidence. Check method and fallback boundaries separately.

## Approve the reviewed revision

~~~mission
review-config-release
~~~

~~~passage
study-debug-logging
~~~
### Select a narrow diagnostic view and a bounded lifetime

Use local configuration and narrowly scoped DEBUG or TRACE logging where appropriate, for example under org.springframework.security.web.FilterChainProxy to inspect filter invocation. Correlate safe labels with a request ID and disable additional tracing after diagnosis. Avoid credential values, session identifiers and personal data in logs. [Filter diagnostics](https://docs.spring.io/spring-security/reference/7.1/servlet/architecture.html#printing-the-security-filters)

~~~passage
study-current-apis
~~~
### Match a tutorial to the installed version

Use the SecurityFilterChain bean and lambda DSL on Spring Security 7.1. Check method signatures and compile against the pinned dependencies before adopting a tutorial. Examples based on WebSecurityConfigurerAdapter belong to older versions. Preserve the exact rules and tests when migrating the configuration style.
