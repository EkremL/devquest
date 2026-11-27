## Follow the nested call

~~~mission
follow-servlet-call
~~~

~~~passage
study-servlet-filters
~~~
### Follow the call and the return

A Servlet Filter can inspect or wrap a request and response. Calling chain.doFilter invokes the rest of the chain, possibly reaching a mapped servlet. Code after that call runs on normal return. Use finally if cleanup must also run after an exception. A filter that handles a response can omit the downstream call.

## Locate the Spring and MVC boundaries

~~~mission
inspect-servlet-delegates
~~~

~~~passage
study-mvc-processing
~~~
### Resolve the application handler

DispatcherServlet is Spring MVC’s front controller. It asks handler mappings to resolve a request and a handler adapter to invoke the selected handler. A return value can be written through message converters or resolved through view processing depending on the handler contract. [DispatcherServlet reference](https://docs.spring.io/spring-framework/reference/7.0/web/webmvc/mvc-servlet.html)

~~~passage
study-pre-dispatch
~~~
### Identify what must happen before dispatch

For a normal REQUEST dispatch mapped to Spring MVC and covered by a container security filter, the selected security filters run on the incoming path before DispatcherServlet. If a security filter does not call downstream, MVC does not dispatch that request. Async, error and forward dispatch behavior depends on registration and configuration.

~~~passage
study-delegating-filter
~~~
### Bridge from container registration to a Spring bean

DelegatingFilterProxy is a Servlet Filter registered with the container. It looks up a Filter bean in the Spring application context and delegates to it, typically the bean named springSecurityFilterChain in a conventional setup. It is distinct from the object that chooses a security chain.

~~~passage
study-chain-proxy
~~~
### Select the chain and invoke its filters

The usual delegate is FilterChainProxy. It applies the configured HttpFirewall before matching and runs a matching security chain. It also clears the SecurityContext after the outer invocation. Its Spring-managed filters are distinct from the container filter registrations. [FilterChainProxy reference](https://docs.spring.io/spring-security/reference/7.1/servlet/architecture.html#servlet-filterchainproxy)

## Route into one security chain

~~~mission
route-servlet-chain
~~~

~~~passage
study-security-filter-chain
~~~
### A matcher paired with an ordered list

A SecurityFilterChain provides matches(request) and getFilters(). That list is executed for a selected request. A chain’s matcher chooses applicability. The individual filters implement its protection and authorization decisions.

~~~passage
study-multiple-chains
~~~
### Select the first match and stop searching

FilterChainProxy evaluates chains in configuration order and invokes only the first matching chain. It does not merge filters from overlapping matches. In a Spring configuration, use explicit bean order to place a specific matcher before a broad fallback. If no security chain matches, the configured chain filters do not apply.

~~~passage
study-request-matching
~~~
### Separate chain selection from rules within a chain

HttpSecurity.securityMatcher scopes whether an entire chain applies. Within its authorizeHttpRequests rules, requestMatchers selects rules on a request that already entered that chain. Verify matcher behavior with context path, HTTP method and representative routes. [Servlet security architecture](https://docs.spring.io/spring-security/reference/7.1/servlet/architecture.html)

### Verify selection against the framework

The two marker filters below only identify their lists. This Java example calls the URL-based test convenience method on the real FilterChainProxy. The simplified matchers use paths only. Test actual requests when method, servlet mapping or other fields matter.

~~~java
import java.util.List;
import jakarta.servlet.Filter;
import org.springframework.security.web.DefaultSecurityFilterChain;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.AnyRequestMatcher;

final class SelectSecurityChain {
    static List<Filter> selected(String path, Filter exportMarker, Filter fallbackMarker) {
        var exports = new DefaultSecurityFilterChain(
                PathPatternRequestMatcher.pathPattern("/exports/**"), exportMarker);
        var fallback = new DefaultSecurityFilterChain(
                AnyRequestMatcher.INSTANCE, fallbackMarker);
        return new FilterChainProxy(List.of(exports, fallback)).getFilters(path);
    }
}
~~~

Check an export route and an unrelated route. Each should return exactly the expected marker.

## Order the filter dependencies

~~~mission
order-servlet-observer
~~~

~~~passage
study-filter-ordering
~~~
### Separate chain order from filter order

Changing which chain is first changes selection. Changing order inside the selected chain changes which filters see the request and when. Authentication usually must establish caller context before a later authorization decision needs it. When adding an observer, choose its position relative to the data source using a verified filter anchor, for example with HttpSecurity.addFilterAfter. Avoid double registration of a filter with the container and with Spring Security.

## Diagnose the missing observer

~~~mission
confirm-servlet-evidence
~~~

~~~passage
study-observe-chain
~~~
### Gather evidence at both startup and request time

Filter list logging at startup shows configured chains. Request-time security tracing in a controlled development environment helps confirm which filters ran. Use a correlation ID and benign markers. When two chains match, verify the chosen list before moving a filter inside a chain. Disable verbose diagnostics when finished and exclude secrets. [Spring Security filter diagnostics](https://docs.spring.io/spring-security/reference/7.1/servlet/architecture.html#printing-the-security-filters)
