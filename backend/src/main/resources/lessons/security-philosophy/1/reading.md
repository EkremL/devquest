## Map what the export service protects

A team is about to add downloadable task exports to a multi-tenant application. Each tenant is a workspace whose exports are private to that workspace. The feature creates a file, shows its status, and lets an eligible member download it. A background worker removes expired files. Start the design review with one question: where could a decision about one workspace accidentally release another workspace’s data?

Prerequisite: follow the caller, evidence, action and resource model from Session 1.1. The Java example uses Java 25. The scenarios use fictional identities and give only the access rules stated here.

~~~passage
study-assets
~~~
### Name the asset and the protected resources

The exported task data is an asset because disclosure affects users. The export file is a protected resource. The job record, filename and status can also reveal sensitive activity, so list them as separate resources. A public health response may disclose only a deliberate, minimal status. Decide which actor needs which resource before naming routes or granting access.

~~~passage
study-trust-boundaries
~~~
### Mark where evidence and responsibility change

A trust boundary is where one component relies on data or a decision from another context. At the browser-to-API boundary, a validated session can establish the actor. An export identifier from the browser is a requested target. At the API-to-storage boundary, the API uses verified tenant membership and the stored export’s tenant to authorize access. An internal network address does not establish either fact. Both boundaries can exist within one deployment.

~~~visual
export-boundaries
~~~

~~~passage
study-threat-modeling
~~~
### Turn a risk into a testable requirement

Write a short threat statement using an asset, a path, an unwanted outcome and a control. For example, a status endpoint and a download endpoint both disclose details about an export. If a valid caller in another tenant requests either resource, the service must prevent disclosure. Require tenant-scoped access for both operations. Verify with synthetic records for two tenants and compare the server decisions, including whether a denied call opens the data stream. Revisit the model each time a new route or worker is added.

~~~passage
study-attack-surface
~~~
### Inventory all the entry points that matter

Attack surface includes each way inputs, access or data can cross a boundary. Here it includes export creation, status, download, link generation, background queue consumers and storage access. Each has an intended caller and permissions. Removing an unused administrative export route reduces exposure. Keeping a needed route requires an explicit rule and regression coverage. Hiding a menu item changes discoverability while leaving server exposure in place.

## Reduce the authority that can travel

~~~passage
study-least-privilege
~~~
### Grant the smallest useful action and scope

A cleanup worker needs to expire old exports in its assigned tenant. It does not need to publish links or read the export body. Give separate identities to jobs with different duties. Bound the action, tenant and, where relevant, lifetime of the grant. If the worker later needs another operation, add it after reviewing that requirement. Smaller grants limit the effects of both mistakes and compromised components.

~~~visual
job-grants
~~~

~~~reader
practice
~~~

~~~passage
study-deny-by-default
~~~
### Unmatched operations require an explicit decision

Permit documented operations with the required evidence and scope. Treat an unrecognized action or a request with no matching allow rule as denied. This makes new routes closed until they have a policy. A Spring Security request chain can explicitly end with `anyRequest().denyAll()` after its specific rules. Those rules apply within the selected chain. Object-level access still needs the actual export and trusted tenant data. See [Spring Security 7.1 request authorization](https://docs.spring.io/spring-security/reference/7.1/servlet/authorization/authorize-http-requests.html).

~~~passage
study-secure-defaults
~~~
### Make the safe path the initial configuration

A new environment starts with private files and no public link publishing. Optional sharing stays disabled until a reviewed decision enables it. Secure defaults apply to initial configuration and new resources. Deny by default governs the runtime decision when policy has no matching permit. Test a fresh environment and an unrecognized action separately. See [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

## Contain failures before data leaves

~~~passage
study-defense-in-depth
~~~
### Use layers with independent responsibilities

A request filter can reject unauthenticated clients early. The export service checks the requested action and stored tenant. A tenant-scoped query or narrowly scoped storage operation limits what the service can fetch. Each layer limits a different failure. Two checks that both consume the same unverified tenant header share the same failure and should not be counted as independent protection.

~~~passage
study-secure-failure
~~~
### Block sensitive work when policy is unavailable

Assume this export service requires current membership before each download. A lookup timeout leaves that membership unknown. Stop before opening the data stream and return the approved generic service error. An outage and a policy denial may have different external status codes even though both withhold data. Log a correlation ID and a bounded internal failure reason under the applicable policy. Keep raw credentials, internal exception traces and export contents out of client responses.

~~~visual
failure-trace
~~~

~~~reader
practice
~~~

> ### Debugger mindset
> When testing failure behavior, check the side effect as well as the response. A generic error is insufficient if the handler already opened or returned the export.

## Turn the policy into a runtime decision

~~~passage
study-authentication-and-trust
~~~
### Trust a verified fact for its stated purpose

Authentication establishes who the caller is under the configured mechanism. The export service may rely on that account identity, but still needs current membership and a valid decision about the requested resource. A trusted decision service’s response also needs to apply to the same operation and resource. Trust is bounded by the evidence, context and purpose. See [NIST digital identity guidance](https://pages.nist.gov/800-63-4/sp800-63.html) for the authentication and relying-party roles.

~~~passage
study-authentication-and-policy
~~~
### Authentication supplies an actor to the policy

A valid session for a North member proves neither a download grant nor the tenant of a particular export. Define the policy as conditions you can compare: verified caller, download grant and matching stored tenant, with current membership available. A caller who needs a new grant should get the narrow operation they need after review. Repeating authentication does not fix an authorization refusal.

~~~passage
study-policy-enforcement
~~~
### Put the check before storage and the response

Policy definition specifies when to permit. Evaluation applies current facts to that rule. Enforcement uses the decision to block or perform the operation. A policy document or boolean return has no protective effect if the handler ignores it. The following Java method models evaluation only. The inputs come from server-verified identity, current membership, trusted grants and the stored export record.

~~~java
import java.util.Set;

class ExportReadPolicy {
    static boolean permits(
            boolean verifiedCaller,
            String currentTenant,
            Set<String> grants,
            String storedTenant) {
        return verifiedCaller
                && currentTenant != null
                && grants.contains("export:download")
                && currentTenant.equals(storedTenant);
    }
}
~~~

Here a null current tenant represents unavailable or unresolved membership. The method expects a non-null grant set and uses an empty set when the caller has no grants. The handler still needs to enforce a false result before touching export bytes and distinguish unavailability from a decided refusal when it constructs the public error.

### Review the release decision

Explain which resource is protected, which verified facts policy uses, what is denied by default, and where enforcement happens. Then name two tests: a legitimate download and a request that must stop before storage. Add an unavailable-policy case. Those distinctions give the next HTTP Authentication Basics session a place to attach evidence, challenges and response semantics.
