# Complete Spring Security Learning Roadmap

This file is the source of truth for learning progress.

A checkbox should be marked only when the topic can be explained, implemented where relevant, and connected to its security risks.

# Module 0 — Project and Learning Setup

## Session 0.1 — Repository and Learning Workflow

- [x] Create the GitHub repository
- [x] Add the README dashboard
- [x] Add the complete roadmap
- [x] Add the lesson template
- [x] Add the architecture document
- [x] Define the commit convention
- [x] Define module-completion tags
- [x] Create the module note directories

## Session 0.2 — Development Environment

- [x] Confirm Java 25
- [x] Confirm Spring Boot 4.x
- [x] Confirm Maven
- [x] Configure IntelliJ IDEA
- [ ] Configure PostgreSQL
- [x] Configure DataGrip
- [x] Add Lombok and enable annotation processing
- [x] Add Bean Validation
- [x] Add Spring Security
- [x] Add Spring Data JPA
- [x] Add testing dependencies
- [x] Reserve Testcontainers for integration-testing lessons

## Session 0.3 — Project Baseline

- [x] Generate the minimal Spring Boot project
- [x] Verify the application starts
- [ ] Verify the PostgreSQL connection
- [x] Create an initial health endpoint
- [x] Add the first application test
- [x] Record the initial dependency versions
- [x] Understand why Spring Boot manages Spring Security versions

# Module 1 — Authentication Foundations

## Session 1.1 — Identity and Access Vocabulary

- [ ] Identity
- [ ] Credential
- [ ] Authentication
- [ ] Authorization
- [ ] Access control
- [ ] Principal
- [ ] Subject
- [ ] User
- [ ] Client
- [ ] Service
- [ ] Resource
- [ ] Resource server
- [ ] Authentication server
- [ ] Identity provider
- [ ] Human-to-service authentication
- [ ] Service-to-service authentication

## Session 1.2 — Security Philosophy

- [ ] Assets and protected resources
- [ ] Trust boundaries
- [ ] Basic threat modeling
- [ ] Attack surface
- [ ] Principle of least privilege
- [ ] Deny-by-default security
- [ ] Secure defaults
- [ ] Defense in depth
- [ ] Secure failure behavior
- [ ] Authentication versus trust
- [ ] Authentication versus authorization policy
- [ ] Policy definition versus policy enforcement

## Session 1.3 — HTTP Authentication Basics

- [ ] HTTP request and response structure
- [ ] Authentication-related headers
- [ ] `Authorization` header
- [ ] `WWW-Authenticate` header
- [ ] Basic authentication
- [ ] Bearer authentication
- [ ] Cookie-based credentials
- [ ] Request body credentials for login
- [ ] Why HTTPS is required
- [ ] Meaning of 200, 201, 400, 401, 403, and 429
- [ ] Authentication challenge versus access denial

## Session 1.4 — Stateful Authentication

- [ ] Server-side sessions
- [ ] Session identifiers
- [ ] Session cookies
- [ ] Session creation
- [ ] Session lookup
- [ ] Session expiration
- [ ] Session invalidation
- [ ] Logout with sessions
- [ ] Horizontal scaling and shared session storage
- [ ] Session fixation
- [ ] Session theft
- [ ] Cookie security attributes
- [ ] `HttpOnly`
- [ ] `Secure`
- [ ] `SameSite`

## Session 1.5 — Stateless and Token-Based Authentication

- [ ] Meaning of stateless request authentication
- [ ] Opaque tokens
- [ ] Self-contained tokens
- [ ] Access tokens
- [ ] Refresh tokens
- [ ] Token issuance
- [ ] Token validation
- [ ] Token expiration
- [ ] Token revocation
- [ ] Token rotation
- [ ] Token replay
- [ ] Token introspection
- [ ] Why token-based does not always mean fully stateless

## Session 1.6 — JWT Foundations

- [ ] JWT header
- [ ] JWT payload
- [ ] JWT signature
- [ ] Claims
- [ ] Registered claims
- [ ] `sub`
- [ ] `iat`
- [ ] `exp`
- [ ] `nbf`
- [ ] `iss`
- [ ] `aud`
- [ ] Signing versus encryption
- [ ] Why JWT payloads are readable
- [ ] Symmetric signing
- [ ] Asymmetric signing
- [ ] Algorithm selection
- [ ] Invalid signatures
- [ ] Expired tokens
- [ ] Algorithm-confusion risks
- [ ] Why JWT is not automatically better than sessions

## Session 1.7 — Authentication Mechanism Comparison

- [ ] Server-side sessions
- [ ] Opaque access tokens
- [ ] JWT access tokens
- [ ] API keys
- [ ] Mutual TLS
- [ ] Centralized identity providers
- [ ] Revocation trade-offs
- [ ] Scalability trade-offs
- [ ] Credential-storage trade-offs
- [ ] Browser versus machine-client requirements
- [ ] Selecting a mechanism based on context

## Session 1.8 — Common Authentication Threats

- [ ] Credential theft
- [ ] Password reuse
- [ ] Brute-force attacks
- [ ] Credential stuffing
- [ ] Token leakage
- [ ] Replay attacks
- [ ] Session fixation
- [ ] Session hijacking
- [ ] User enumeration
- [ ] Insecure credential logging
- [ ] Weak expiration policies
- [ ] Missing revocation strategy
- [ ] Broken authentication flows

## Module 1 Completion

- [ ] Complete the Module 1 explanation exercise
- [ ] Complete the Module 1 HTTP-flow exercise
- [ ] Complete the Module 1 threat-model exercise
- [ ] Write “Technology-Independent Takeaways”
- [ ] Tag the module as complete

# Module 2 — Spring Security Foundations

## Session 2.1 — What Spring Security Does

- [ ] Authentication support
- [ ] Authorization support
- [ ] Protection against common attacks
- [ ] Servlet security integration
- [ ] Security before controller execution
- [ ] Security configuration versus business rules
- [ ] Spring Security as a framework implementation, not a protocol

## Session 2.2 — Servlet Filter Architecture

- [ ] Servlet filters
- [ ] Normal Spring MVC request processing
- [ ] Security processing before `DispatcherServlet`
- [ ] `DelegatingFilterProxy`
- [ ] `FilterChainProxy`
- [ ] `SecurityFilterChain`
- [ ] Multiple security filter chains
- [ ] Request matching for filter chains
- [ ] Filter ordering
- [ ] Observing the active filter chain

## Session 2.3 — Security Context and Authentication Model

- [ ] `SecurityContext`
- [ ] `SecurityContextHolder`
- [ ] `Authentication`
- [ ] Principal
- [ ] Credentials
- [ ] Authorities
- [ ] Anonymous authentication
- [ ] Authenticated versus unauthenticated `Authentication`
- [ ] Security context lifecycle
- [ ] Thread-local behavior
- [ ] Clearing security context safely

## Session 2.4 — Authentication Components

- [ ] `AuthenticationManager`
- [ ] `ProviderManager`
- [ ] `AuthenticationProvider`
- [ ] Multiple authentication mechanisms
- [ ] `UserDetails`
- [ ] `UserDetailsService`
- [ ] `GrantedAuthority`
- [ ] `PasswordEncoder`
- [ ] Account-status checks
- [ ] Authentication success
- [ ] Authentication failure

## Session 2.5 — Initial Secured REST API

- [ ] Add `SecurityFilterChain`
- [ ] Configure public endpoints
- [ ] Configure authenticated endpoints
- [ ] Configure Basic authentication for learning
- [ ] Call a public endpoint
- [ ] Call a protected endpoint without credentials
- [ ] Call a protected endpoint with valid credentials
- [ ] Inspect the authenticated principal
- [ ] Explain the complete request flow

## Session 2.6 — 401 and 403

- [ ] Meaning of 401 Unauthorized
- [ ] Meaning of 403 Forbidden
- [ ] Missing credentials
- [ ] Invalid credentials
- [ ] Authenticated but insufficient authority
- [ ] `AuthenticationEntryPoint`
- [ ] `AccessDeniedHandler`
- [ ] Consistent JSON security errors
- [ ] Avoiding information leakage in errors

## Session 2.7 — Security Configuration Principles

- [ ] Lambda-based configuration
- [ ] Request matcher ordering
- [ ] Deny-by-default configuration
- [ ] Avoiding accidental public endpoints
- [ ] Stateless versus session configuration
- [ ] CSRF defaults and why they exist
- [ ] CORS placement
- [ ] Security debug logging
- [ ] Avoiding obsolete tutorials and deprecated APIs

## Module 2 Completion

- [ ] Build the basic secured API without JWT
- [ ] Draw the active Spring Security request flow
- [ ] Explain every core Spring Security component
- [ ] Test 401 and 403
- [ ] Write “Technology-Independent Takeaways”
- [ ] Tag the module as complete

# Module 3 — User Registration and Login

## Session 3.1 — Identity Data Model

- [ ] User entity
- [ ] Role entity
- [ ] Permission entity
- [ ] User-role relationship
- [ ] Role-permission relationship
- [ ] Unique email or username
- [ ] Account enabled state
- [ ] Account locked state
- [ ] Audit timestamps
- [ ] Database constraints
- [ ] Avoiding sensitive fields in responses

## Session 3.2 — Password Storage

- [ ] Password hashing
- [ ] Why passwords are not encrypted for storage
- [ ] Salts
- [ ] Work factors
- [ ] BCrypt
- [ ] Argon2 overview
- [ ] PBKDF2 overview
- [ ] `DelegatingPasswordEncoder`
- [ ] Hash migration strategy
- [ ] Password comparison
- [ ] Never logging raw passwords
- [ ] Password policy trade-offs

## Session 3.3 — Registration API

- [ ] Registration request DTO
- [ ] Registration response DTO
- [ ] Lombok-based class DTOs
- [ ] Bean Validation
- [ ] Email normalization
- [ ] Duplicate-user checks
- [ ] Password hashing
- [ ] Default role assignment
- [ ] Transaction boundary
- [ ] Controller responsibility
- [ ] Service responsibility
- [ ] Repository responsibility
- [ ] Safe registration errors

## Session 3.4 — Database-Backed User Loading

- [ ] Custom `UserDetails`
- [ ] Custom `UserDetailsService`
- [ ] Mapping roles and permissions
- [ ] Account-state mapping
- [ ] Username-not-found behavior
- [ ] Preventing user enumeration
- [ ] Transaction and lazy-loading considerations

## Session 3.5 — Username and Password Authentication

- [ ] Login request DTO
- [ ] Login response DTO
- [ ] `UsernamePasswordAuthenticationToken`
- [ ] `AuthenticationManager`
- [ ] `DaoAuthenticationProvider`
- [ ] Password verification flow
- [ ] Account-state verification flow
- [ ] Authentication success
- [ ] Authentication failure
- [ ] Safe external error messages
- [ ] Internal audit events

## Session 3.6 — Exception Handling and Validation

- [ ] Validation error response
- [ ] Duplicate-user response
- [ ] Invalid-credential response
- [ ] Locked-account response
- [ ] Disabled-account response
- [ ] Global exception handling
- [ ] Security exception boundaries
- [ ] Correlation identifiers
- [ ] Avoiding stack traces in API responses

## Module 3 Completion

- [ ] Implement registration
- [ ] Implement database-backed login
- [ ] Review password-storage security
- [ ] Test duplicate registration
- [ ] Test valid and invalid login
- [ ] Explain the authentication-manager flow
- [ ] Write “Technology-Independent Takeaways”
- [ ] Tag the module as complete

# Module 4 — JWT Authentication

## Session 4.1 — Token Design

- [ ] Define token purpose
- [ ] Define token issuer
- [ ] Define token audience
- [ ] Define token subject
- [ ] Define token lifetime
- [ ] Select required claims
- [ ] Avoid sensitive JWT claims
- [ ] Define clock-skew policy
- [ ] Define key strategy
- [ ] Define revocation limitations
- [ ] Document token trust boundaries

## Session 4.2 — Cryptographic Keys and Algorithms

- [ ] Secret keys
- [ ] Public and private keys
- [ ] HMAC overview
- [ ] RSA overview
- [ ] Signing algorithm selection
- [ ] Key length
- [ ] Key generation
- [ ] Key storage
- [ ] Key rotation
- [ ] `kid` header
- [ ] Signing versus encryption
- [ ] Never trusting the token-declared algorithm blindly

## Session 4.3 — Access-Token Generation

- [ ] JWT encoder
- [ ] Header construction
- [ ] Claim construction
- [ ] Subject
- [ ] Issued-at time
- [ ] Expiration time
- [ ] Issuer
- [ ] Audience
- [ ] Authority claims
- [ ] Token response DTO
- [ ] Avoiding excessive claims
- [ ] Unit testing token generation

## Session 4.4 — Access-Token Validation

- [ ] JWT decoder
- [ ] Signature validation
- [ ] Expiration validation
- [ ] Not-before validation
- [ ] Issuer validation
- [ ] Audience validation
- [ ] Required-claim validation
- [ ] Malformed token handling
- [ ] Invalid-signature handling
- [ ] Expired-token handling
- [ ] Safe error responses
- [ ] Validator composition

## Session 4.5 — Bearer Authentication Flow

- [ ] `Authorization: Bearer`
- [ ] Header extraction
- [ ] Missing header
- [ ] Incorrect scheme
- [ ] Empty token
- [ ] Credential validation
- [ ] Authenticated identity creation
- [ ] Authority mapping
- [ ] Security context population
- [ ] Controller access
- [ ] Security context cleanup

## Session 4.6 — Custom `OncePerRequestFilter`

- [ ] Purpose of `OncePerRequestFilter`
- [ ] Filter execution guarantees
- [ ] Skipping public endpoints
- [ ] Extracting the bearer token
- [ ] Validating the token
- [ ] Loading the user when required
- [ ] Creating `Authentication`
- [ ] Setting `SecurityContext`
- [ ] Continuing the filter chain
- [ ] Avoiding double authentication
- [ ] Handling validation failures
- [ ] Filter ordering
- [ ] Understanding why custom filters can be dangerous

## Session 4.7 — Spring Resource Server Approach

- [ ] OAuth2 Resource Server starter
- [ ] `JwtDecoder`
- [ ] Built-in bearer-token processing
- [ ] JWT authentication converter
- [ ] Authority mapping
- [ ] Standard error behavior
- [ ] Custom validators
- [ ] Comparing built-in support with a custom filter
- [ ] Choosing production-oriented defaults
- [ ] Avoiding unnecessary custom security code

## Session 4.8 — Stateless Session Management

- [ ] `SessionCreationPolicy`
- [ ] Stateless request authentication
- [ ] Security context per request
- [ ] Why a database can still be used
- [ ] Why refresh-token storage introduces state
- [ ] Logout limitations for pure self-contained tokens
- [ ] Revocation trade-offs
- [ ] Caching and user-state trade-offs

## Module 4 Completion

- [ ] Generate valid access tokens
- [ ] Validate signature and standard claims
- [ ] Reject expired tokens
- [ ] Reject invalid signatures
- [ ] Trace the full bearer request flow
- [ ] Compare custom filter and Resource Server approaches
- [ ] Write “Technology-Independent Takeaways”
- [ ] Tag the module as complete

# Module 5 — Authorization

## Session 5.1 — Authorization Models

- [ ] Role-based access control
- [ ] Permission-based access control
- [ ] Resource ownership
- [ ] Team-based access
- [ ] Introductory attribute-based access control
- [ ] Policy decision
- [ ] Policy enforcement
- [ ] Least privilege
- [ ] Deny by default
- [ ] Role explosion
- [ ] Permission naming

## Session 5.2 — Roles and Authorities in Spring Security

- [ ] `GrantedAuthority`
- [ ] Role prefix conventions
- [ ] `hasRole`
- [ ] `hasAuthority`
- [ ] Role-to-permission mapping
- [ ] JWT authority claims
- [ ] Database authority mapping
- [ ] Avoiding inconsistent authority names

## Session 5.3 — Request-Level Authorization

- [ ] `requestMatchers`
- [ ] HTTP-method-specific rules
- [ ] Public endpoints
- [ ] Authenticated endpoints
- [ ] Manager endpoints
- [ ] Administrator endpoints
- [ ] Rule ordering
- [ ] Fallback deny rule
- [ ] Testing matcher behavior

## Session 5.4 — Method-Level Security

- [ ] Enable method security
- [ ] `@PreAuthorize`
- [ ] `@PostAuthorize` overview
- [ ] Method parameters in policies
- [ ] Return-value authorization overview
- [ ] Service-layer enforcement
- [ ] Controller versus service authorization
- [ ] Avoiding annotation scattering

## Session 5.5 — Ownership Checks

- [ ] Authenticated user identifier
- [ ] Resource owner identifier
- [ ] Ownership policy
- [ ] Preventing IDOR
- [ ] Read-own-resource
- [ ] Update-own-resource
- [ ] Delete-own-resource
- [ ] Admin override
- [ ] Avoiding client-supplied ownership
- [ ] Query-level versus service-level enforcement
- [ ] Not-found versus forbidden trade-offs

## Session 5.6 — Team and Manager Policies

- [ ] Team membership
- [ ] Team manager
- [ ] Manager reads team tasks
- [ ] User reads own tasks
- [ ] Administrator reads all tasks
- [ ] Membership changes
- [ ] Preventing stale authorization
- [ ] Centralizing policy logic
- [ ] Testing policy combinations

## Session 5.7 — Authorization Architecture

- [ ] Reusable policy service
- [ ] Custom authorization manager overview
- [ ] Permission evaluator overview
- [ ] Domain-policy methods
- [ ] Avoiding hard-coded checks everywhere
- [ ] Avoiding authorization only in the UI
- [ ] Avoiding authorization only at the gateway
- [ ] Auditing sensitive decisions

## Module 5 Completion

- [ ] Implement user, manager, and administrator policies
- [ ] Implement task ownership checks
- [ ] Test IDOR scenarios
- [ ] Test role and permission differences
- [ ] Explain RBAC, permissions, ownership, and ABAC
- [ ] Write “Technology-Independent Takeaways”
- [ ] Tag the module as complete

# Module 6 — Refresh Tokens and Logout

## Session 6.1 — Why Refresh Tokens Exist

- [ ] Short-lived access tokens
- [ ] Long-lived login sessions
- [ ] Access-token compromise window
- [ ] Refresh-token privilege
- [ ] Why refresh tokens are high-value credentials
- [ ] Client-type differences
- [ ] When refresh tokens are unnecessary

## Session 6.2 — Refresh-Token Model

- [ ] Opaque refresh tokens
- [ ] Randomness and entropy
- [ ] Token hashing
- [ ] Refresh-session entity
- [ ] User association
- [ ] Device association
- [ ] Creation time
- [ ] Expiration time
- [ ] Revocation time
- [ ] Replacement linkage
- [ ] Database indexes
- [ ] Cleanup strategy

## Session 6.3 — Refresh Flow

- [ ] Refresh request
- [ ] Token lookup
- [ ] Hash comparison
- [ ] Expiration check
- [ ] Revocation check
- [ ] User-state check
- [ ] New access-token issuance
- [ ] New refresh-token issuance
- [ ] Atomic update
- [ ] Safe response
- [ ] Transaction boundary

## Session 6.4 — Token Rotation and Reuse Detection

- [ ] One-time refresh-token use
- [ ] Rotation
- [ ] Token family
- [ ] Replaced token
- [ ] Reuse detection
- [ ] Possible token theft
- [ ] Revoking the token family
- [ ] Race conditions
- [ ] Concurrent refresh requests
- [ ] False-positive trade-offs

## Session 6.5 — Logout and Revocation

- [ ] Logout in a session-based system
- [ ] Logout in a stateless access-token system
- [ ] Revoking refresh sessions
- [ ] Existing access-token lifetime
- [ ] Access-token deny lists
- [ ] Trade-offs of deny lists
- [ ] Logout from one device
- [ ] Logout from all devices
- [ ] Account disablement
- [ ] Password-change effects

## Session 6.6 — Multiple Devices and Session Management

- [ ] Per-device refresh sessions
- [ ] Device naming
- [ ] Session listing
- [ ] Session revocation
- [ ] Maximum active sessions
- [ ] Suspicious-session detection
- [ ] Privacy considerations
- [ ] Audit events

## Module 6 Completion

- [ ] Implement database-backed refresh sessions
- [ ] Store refresh-token hashes
- [ ] Implement rotation
- [ ] Implement revocation
- [ ] Test reuse detection
- [ ] Implement one-device and all-device logout
- [ ] Write “Technology-Independent Takeaways”
- [ ] Tag the module as complete

# Module 7 — Production Security

## Session 7.1 — CORS

- [ ] Same-origin policy
- [ ] What CORS does
- [ ] What CORS does not do
- [ ] Simple requests
- [ ] Preflight requests
- [ ] Allowed origins
- [ ] Allowed methods
- [ ] Allowed headers
- [ ] Credentials
- [ ] Wildcard risks
- [ ] Environment-specific configuration
- [ ] CORS and Spring Security ordering

## Session 7.2 — CSRF

- [ ] CSRF attack model
- [ ] Ambient browser credentials
- [ ] Session cookies and CSRF
- [ ] Cookie-carried tokens and CSRF
- [ ] Authorization-header tokens and CSRF
- [ ] Why disabling CSRF blindly is dangerous
- [ ] Synchronizer tokens
- [ ] SameSite cookies
- [ ] Double-submit overview
- [ ] Deciding whether protection is necessary

## Session 7.3 — Token Transport and Browser Storage

- [ ] Authorization header
- [ ] HttpOnly cookie
- [ ] localStorage risks
- [ ] sessionStorage risks
- [ ] XSS and token theft
- [ ] CSRF trade-offs
- [ ] Browser versus mobile clients
- [ ] Backend-for-frontend overview
- [ ] Choosing a transport strategy

## Session 7.4 — HTTPS and Security Headers

- [ ] TLS purpose
- [ ] HTTPS in production
- [ ] Reverse proxies
- [ ] Forwarded headers
- [ ] HSTS
- [ ] Content-Type options
- [ ] Content Security Policy overview
- [ ] Frame options
- [ ] Referrer policy
- [ ] Cache-control for sensitive responses
- [ ] Secure-cookie attributes

## Session 7.5 — Secret and Key Management

- [ ] No secrets in source control
- [ ] Environment variables
- [ ] Configuration files
- [ ] Secret managers
- [ ] Private-key protection
- [ ] Key rotation
- [ ] Separate development and production secrets
- [ ] Accidental Git exposure
- [ ] Secret scanning
- [ ] `.gitignore`
- [ ] Operational access controls

## Session 7.6 — Brute Force and Abuse Protection

- [ ] Login rate limiting
- [ ] IP-based limits
- [ ] Account-based limits
- [ ] Distributed attacks
- [ ] Account lockout
- [ ] Temporary lockout
- [ ] Exponential delays
- [ ] CAPTCHA trade-offs
- [ ] Credential stuffing
- [ ] Monitoring suspicious login activity
- [ ] 429 responses

## Session 7.7 — Safe Error Handling and Validation

- [ ] Bean Validation
- [ ] Input normalization
- [ ] Mass-assignment risks
- [ ] Safe authentication errors
- [ ] Safe authorization errors
- [ ] Avoiding stack-trace exposure
- [ ] Correlation identifiers
- [ ] Consistent error schema
- [ ] Avoiding user enumeration
- [ ] Secure failure behavior

## Session 7.8 — Injection and Browser Threat Context

- [ ] SQL injection
- [ ] Parameterized queries
- [ ] JPA limitations and safe use
- [ ] Native-query risks
- [ ] XSS in backend API contexts
- [ ] Output encoding responsibilities
- [ ] Stored untrusted content
- [ ] HTML-producing endpoints
- [ ] File-upload considerations overview

## Session 7.9 — Logging, Auditing, and Privacy

- [ ] Authentication-success events
- [ ] Authentication-failure events
- [ ] Authorization-denial events
- [ ] Refresh-token events
- [ ] Administrative actions
- [ ] Never logging passwords
- [ ] Never logging complete tokens
- [ ] Minimizing personal data
- [ ] Log integrity
- [ ] Correlation identifiers
- [ ] Retention considerations
- [ ] Audit versus debug logs

## Session 7.10 — Defense in Depth

- [ ] Secure defaults
- [ ] Multiple independent controls
- [ ] Database constraints
- [ ] Application authorization
- [ ] Gateway controls
- [ ] Network controls
- [ ] Monitoring
- [ ] Incident response overview
- [ ] Dependency updates
- [ ] Vulnerability management
- [ ] Security review checklist

## Module 7 Completion

- [ ] Document CORS and CSRF decisions
- [ ] Document token transport
- [ ] Remove secrets from the repository
- [ ] Add safe error responses
- [ ] Add brute-force protections
- [ ] Add security audit events
- [ ] Complete a production threat review
- [ ] Write “Technology-Independent Takeaways”
- [ ] Tag the module as complete

# Module 8 — Testing and Debugging

## Session 8.1 — Security Test Strategy

- [ ] Unit tests
- [ ] Slice tests
- [ ] MockMvc security tests
- [ ] Integration tests
- [ ] End-to-end tests overview
- [ ] Positive tests
- [ ] Negative tests
- [ ] Abuse-case tests
- [ ] Test-data security

## Session 8.2 — Authentication Unit Tests

- [ ] Registration-service tests
- [ ] Password-hashing tests
- [ ] Login-service tests
- [ ] Locked-account tests
- [ ] Disabled-account tests
- [ ] Token-generation tests
- [ ] Token-validation tests
- [ ] Refresh-service tests
- [ ] Rotation tests
- [ ] Reuse-detection tests

## Session 8.3 — Spring Security Test

- [ ] `spring-security-test`
- [ ] `@WithMockUser`
- [ ] Custom security context factory overview
- [ ] Authenticated requests
- [ ] Anonymous requests
- [ ] Authorities in tests
- [ ] CSRF test support
- [ ] Avoiding unrealistic mocked identities

## Session 8.4 — MockMvc Endpoint Tests

- [ ] Public endpoint tests
- [ ] Protected endpoint tests
- [ ] 401 tests
- [ ] 403 tests
- [ ] Role tests
- [ ] Permission tests
- [ ] Ownership tests
- [ ] Manager-policy tests
- [ ] Administrator-policy tests
- [ ] Error-response assertions

## Session 8.5 — JWT Security Tests

- [ ] Missing bearer token
- [ ] Invalid bearer scheme
- [ ] Malformed JWT
- [ ] Invalid signature
- [ ] Expired JWT
- [ ] Future `nbf`
- [ ] Incorrect issuer
- [ ] Incorrect audience
- [ ] Missing required claim
- [ ] Incorrect authority claim
- [ ] Valid token

## Session 8.6 — Testcontainers Integration Tests

- [ ] PostgreSQL container
- [ ] Dynamic properties
- [ ] Schema migration
- [ ] Repository integration
- [ ] Registration integration test
- [ ] Login integration test
- [ ] Protected endpoint integration test
- [ ] Refresh integration test
- [ ] Cleanup and isolation
- [ ] CI compatibility

## Session 8.7 — Debugging Spring Security

- [ ] Enable Spring Security logs
- [ ] Read the filter-chain log
- [ ] Identify the active filter chain
- [ ] Inspect authentication state
- [ ] Inspect authorities
- [ ] Trace authentication failure
- [ ] Trace access denial
- [ ] Debug matcher ordering
- [ ] Debug filter ordering
- [ ] Debug CORS preflight failures
- [ ] Debug CSRF failures
- [ ] Avoid leaking credentials while debugging

## Session 8.8 — Common Configuration Mistakes

- [ ] Missing fallback authorization rule
- [ ] Incorrect matcher order
- [ ] Wrong role prefix
- [ ] Filter added in the wrong position
- [ ] Security context not populated
- [ ] Security context populated without validation
- [ ] Incorrect password encoder
- [ ] Incorrect key encoding
- [ ] Disabled CSRF without analysis
- [ ] Overly broad CORS configuration
- [ ] Returning 403 instead of 401
- [ ] Trusting unvalidated JWT claims

## Module 8 Completion

- [ ] Build the unit-test suite
- [ ] Build the MockMvc security suite
- [ ] Build JWT negative tests
- [ ] Build Testcontainers integration tests
- [ ] Debug a deliberately broken filter chain
- [ ] Write “Technology-Independent Takeaways”
- [ ] Tag the module as complete

# Module 9 — Separate Authentication Service Architecture

## Session 9.1 — Distributed Trust Model

- [ ] Authentication service
- [ ] Resource service
- [ ] API gateway
- [ ] Identity provider
- [ ] Client application
- [ ] Trust boundaries
- [ ] Token issuer
- [ ] Token consumer
- [ ] Centralized versus local authorization
- [ ] Failure domains
- [ ] Network threats

## Session 9.2 — Token Issuance and Validation

- [ ] Auth service issues tokens
- [ ] Resource services validate tokens
- [ ] Shared-secret validation
- [ ] Risks of shared secrets
- [ ] Asymmetric-key validation
- [ ] Private signing key
- [ ] Public verification key
- [ ] Key distribution
- [ ] Key rotation
- [ ] Token audience per service
- [ ] Issuer validation

## Session 9.3 — RSA and JWKS

- [ ] RSA public/private keys
- [ ] Signing with the private key
- [ ] Verification with the public key
- [ ] JSON Web Key
- [ ] JSON Web Key Set
- [ ] JWKS endpoint
- [ ] `kid`
- [ ] Key caching
- [ ] Key rotation
- [ ] Unknown-key handling
- [ ] JWKS endpoint availability

## Session 9.4 — Gateway Authentication

- [ ] Authentication at the gateway
- [ ] Authorization at the gateway
- [ ] Authorization in resource services
- [ ] Defense in depth
- [ ] Token relay
- [ ] Header enrichment
- [ ] Header spoofing
- [ ] Trusted network boundaries
- [ ] Removing untrusted identity headers
- [ ] Why blindly trusting headers is dangerous
- [ ] Gateway outage implications

## Session 9.5 — Passing User Identity Between Services

- [ ] Forwarding the original access token
- [ ] Token exchange overview
- [ ] Internal identity token overview
- [ ] Signed identity context
- [ ] Correlation identifiers
- [ ] User impersonation risks
- [ ] Downstream audience
- [ ] Least-privilege propagation
- [ ] Avoiding excessive personal data

## Session 9.6 — Service-to-Service Authentication

- [ ] Machine identities
- [ ] Client credentials
- [ ] Service accounts
- [ ] API keys
- [ ] Mutual TLS
- [ ] Signed service tokens
- [ ] Workload identity overview
- [ ] Secret rotation
- [ ] Service-level permissions
- [ ] User context versus service context

## Session 9.7 — OAuth 2.0 Foundations

- [ ] Resource owner
- [ ] Client
- [ ] Authorization server
- [ ] Resource server
- [ ] Access token
- [ ] Refresh token
- [ ] Authorization Code flow
- [ ] PKCE
- [ ] Client Credentials flow
- [ ] Scope
- [ ] Consent overview
- [ ] Token endpoint
- [ ] Authorization endpoint
- [ ] OAuth 2.0 is authorization delegation, not a token format
- [ ] JWT is not required by OAuth 2.0

## Session 9.8 — OpenID Connect

- [ ] Identity layer over OAuth 2.0
- [ ] ID token
- [ ] Access token
- [ ] UserInfo endpoint
- [ ] Authentication versus API authorization
- [ ] OIDC scopes
- [ ] Claims
- [ ] Nonce
- [ ] Discovery document
- [ ] OIDC is not the same as JWT

## Session 9.9 — Centralized Identity Providers

- [ ] Keycloak overview
- [ ] Managed identity providers
- [ ] Build-versus-buy decision
- [ ] User lifecycle
- [ ] Password policies
- [ ] MFA
- [ ] Federation
- [ ] Social login
- [ ] Administrative burden
- [ ] Security patching
- [ ] When not to write authentication from scratch

## Session 9.10 — Workplace Architecture Mapping

- [ ] Identify the external authentication layer
- [ ] Identify the token or credential issuer
- [ ] Identify where validation occurs
- [ ] Identify where authorization occurs
- [ ] Identify trusted headers
- [ ] Identify gateway responsibilities
- [ ] Identify resource-service responsibilities
- [ ] Identify shared-secret or asymmetric validation
- [ ] Identify failure behavior
- [ ] Draw the workplace request flow without exposing confidential details

## Module 9 Completion

- [ ] Draw the separate-authentication architecture
- [ ] Validate JWTs with a public key
- [ ] Explain JWKS and key rotation
- [ ] Explain gateway and resource-service responsibilities
- [ ] Explain OAuth 2.0 roles and practical flows
- [ ] Explain OIDC identity versus API authorization
- [ ] Compare custom authentication with Keycloak
- [ ] Write “Technology-Independent Takeaways”
- [ ] Tag the module as complete

# Module 10 — Final Hardening and Delivery

## Session 10.1 — Architecture Review

- [ ] Review trust boundaries
- [ ] Review authentication mechanisms
- [ ] Review authorization policies
- [ ] Review token lifetimes
- [ ] Review refresh-token lifecycle
- [ ] Review secret management
- [ ] Review logs and personal data
- [ ] Review failure behavior
- [ ] Review test coverage
- [ ] Review dependency versions

## Session 10.2 — Documentation

- [ ] Update README
- [ ] Add architecture diagrams
- [ ] Add request-flow diagrams
- [ ] Add API examples
- [ ] Add security decisions
- [ ] Add threat-model summary
- [ ] Add local setup instructions
- [ ] Add testing instructions
- [ ] Add known limitations
- [ ] Add future improvements

## Session 10.3 — Delivery

- [ ] Add Docker Compose for PostgreSQL
- [ ] Add environment-variable examples without secrets
- [ ] Add database migrations
- [ ] Add CI test workflow
- [ ] Run all tests
- [ ] Check the repository for secrets
- [ ] Check the repository for generated files
- [ ] Create the final release tag
- [ ] Prepare a technical explanation of the system
- [ ] Prepare an interview-style architecture explanation

# Final Competency Checklist

- [ ] I can distinguish identity, credentials, authentication, authorization, and access control.
- [ ] I can compare sessions, opaque tokens, JWTs, API keys, mTLS, and identity providers.
- [ ] I can trace a request through the Spring Security filter chain.
- [ ] I can explain `SecurityContext`, `Authentication`, providers, managers, and authorities.
- [ ] I can implement secure registration and login.
- [ ] I can explain and implement password hashing correctly.
- [ ] I can issue and validate access tokens.
- [ ] I can explain JWT risks and limitations.
- [ ] I can implement role, permission, ownership, and team authorization.
- [ ] I can implement refresh-token rotation and revocation.
- [ ] I can explain CORS and CSRF based on the actual client architecture.
- [ ] I can test 401, 403, invalid tokens, and ownership failures.
- [ ] I can debug Spring Security request processing.
- [ ] I can explain separate auth services, gateways, RSA, and JWKS.
- [ ] I can explain OAuth 2.0 and OpenID Connect at a practical level.
- [ ] I can decide when a centralized identity provider is more appropriate.
- [ ] I can defend the project's architecture and security trade-offs in an interview.
