## Build minimum access

~~~mission
build-export-grants
~~~

~~~passage
study-assets
~~~
### Protect status as well as bytes

The export file contains private task data. Treat the job record, filename and status as protected resources too. The grant matrix makes those surfaces separately visible.

~~~passage
study-trust-boundaries
~~~
### Separate claims from facts used by policy

An export ID from the browser names the requested target. Membership comes from verified server state. The export’s tenant comes from storage. The application crosses one boundary when accepting evidence and another when requesting data.

~~~passage
study-threat-modeling
~~~
### Name an unwanted result and test against it

A South member querying a North export might learn its title or receive the file. Test both operations with synthetic records and verify neither leaks data. For download, also check that the data stream stays closed.

~~~passage
study-attack-surface
~~~
### Inventory every route to the asset

Review create, status, download, link publishing, background workers and storage access. Removing an unused route reduces exposure. Hiding its menu item changes visibility. The server rule still has to protect the operation.

## Repair the default policy

~~~mission
repair-default-policy
~~~

~~~passage
study-least-privilege
~~~
### Limit an identity by operation and tenant

The exporter only reads status and downloads its own workspace’s files. A different cleanup actor can receive a tenant-scoped expiration grant. Keep separate responsibilities in separate grants so changing one job does not enlarge the other.

~~~passage
study-deny-by-default
~~~
### Leave unfamiliar operations closed

In this lab, an explicit matching allow rule grants access after verification and scope checks. An unlisted action reaches the fallback. Spring Security can use an explicit `anyRequest().denyAll()` after named routes in the selected chain. An object-level check still needs the stored target. [Spring Security request authorization](https://docs.spring.io/spring-security/reference/7.1/servlet/authorization/authorize-http-requests.html)

~~~passage
study-secure-defaults
~~~
### Start a fresh installation with private resources

Create files with private access and leave public link publishing disabled until reviewed. Startup defaults and the runtime fallback cover different moments. Test a fresh configuration as well as an unrecognized action. [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

## Contain policy failures

~~~mission
simulate-policy-failure
~~~

~~~passage
study-defense-in-depth
~~~
### Ask what each layer can independently stop

The entrance verifies the caller, the service applies the export policy and storage applies a tenant condition. Repeating the same client-provided workspace at every layer would share one failure. Use the isolated storage probe in the next mission to test the second boundary directly.

~~~passage
study-secure-failure
~~~
### Compare the response with the side effect

A membership timeout leaves the current permit unknown. Keep the stream closed and use this API’s generic service-error contract. Explicit refusal uses a different response. Log a correlation ID and bounded decision reason, keeping credentials and export data out of diagnostic messages.

## Find the enforcement gap

~~~mission
trace-export-enforcement
~~~

~~~passage
study-authentication-and-trust
~~~
### Trust verified evidence for its intended purpose

A validated session establishes an identity. It supplies neither current membership nor a valid permit for every operation. Bind any trusted decision to its caller, action and resource. [NIST digital identity guidance](https://pages.nist.gov/800-63-4/sp800-63.html)

~~~passage
study-authentication-and-policy
~~~
### Feed separate facts into the authorization rule

This policy needs a verified caller, current membership, an export download grant and a stored tenant match. Test the action and scope independently. Repeating sign-in leaves an authorization refusal unchanged if the grants and target are the same.

~~~passage
study-policy-enforcement
~~~
### Apply the result before touching bytes

The rule describes the permission, the method evaluates trusted inputs, and the service enforces the result. The Java evaluator below models the decision at the service guard. Use an empty set for no grants and null for unresolved membership. Guard the storage call on the result. The surrounding service selects the correct response for a decided refusal or unavailable evidence.

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

## Review the release

~~~mission
review-export-release
~~~

A release review should preserve a positive case alongside denial and outage cases. Test that North can download, that South and unmatched actions cannot, and that an unavailable verifier cannot cause storage to open. Continue to the independent assessment to explain these decisions without the workbench.
