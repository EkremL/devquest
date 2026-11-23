# Project Architecture

## 1. Architectural Goal

Build a secure task-management REST API incrementally as a modular monolith. After the monolithic security model is understood and tested, extract or simulate authentication as a separate service behind an API gateway.

We will not begin with microservices. Splitting an authentication system before understanding its trust boundaries usually creates distributed confusion rather than distributed security.

## 2. Main Business Capabilities

- User registration and login
- User and account management
- Role and permission management
- Task creation and management
- Task ownership checks
- Team membership and manager access
- Administrator operations
- Access-token issuance and validation
- Refresh-token rotation and revocation
- Consistent authentication and authorization errors
- Security auditing
- Unit, security, and integration testing

## 3. Initial Runtime Architecture

```text
Client
  |
  | HTTP request
  v
Spring Security Filter Chain
  |
  | authenticated and authorized request
  v
REST Controller
  |
  v
Application Service
  |
  | business and ownership rules
  v
Repository
  |
  v
PostgreSQL
```

Security filters handle cross-cutting request security. Business services still enforce resource-specific rules such as ownership and team access.

## 4. Incremental Architecture Phases

### Phase A — Security Baseline

- Public and protected endpoints
- Default Spring Security behavior
- Basic authentication for learning
- Security filter-chain observation
- 401 and 403 behavior

### Phase B — Database-Backed Identity

- User entity
- Roles and permissions
- Password hashing
- Registration
- Username/password login
- Account-state checks

### Phase C — Access Tokens

- JWT access-token issuance
- Bearer-token processing
- Signature, claim, issuer, audience, and expiration validation
- Stateless request authentication
- Custom-filter learning implementation
- Spring Resource Server production comparison

### Phase D — Resource Authorization

- Endpoint rules
- Method security
- Role and permission checks
- Ownership policies
- Team and manager policies
- Introductory attribute-based rules

### Phase E — Refresh Sessions

- Database-backed refresh tokens
- Token hashing
- Rotation
- Revocation
- Reuse detection
- Multi-device sessions
- Logout semantics

### Phase F — Production Hardening

- CORS and CSRF decisions
- Secure token transport
- Secret management
- Rate limiting and brute-force controls
- Safe logging and error handling
- Security tests and Testcontainers

### Phase G — Distributed Identity

- Separate authentication service
- API gateway
- Resource-service validation
- Asymmetric signing and JWKS
- OAuth 2.0 and OpenID Connect
- Centralized identity provider comparison

## 5. Recommended Package Structure

Use package-by-feature with a small shared core. Do not create a deeply abstract clean-architecture structure before the domain requires it.

```text
com.example.securetask
├── auth
│   ├── api
│   ├── application
│   ├── dto
│   └── exception
├── security
│   ├── config
│   ├── principal
│   ├── token
│   ├── filter
│   └── handler
├── user
│   ├── api
│   ├── application
│   ├── domain
│   └── persistence
├── task
│   ├── api
│   ├── application
│   ├── domain
│   └── persistence
├── team
│   ├── api
│   ├── application
│   ├── domain
│   └── persistence
└── common
    ├── error
    ├── validation
    └── audit
```

The exact package names may evolve. Architectural changes should be explained rather than performed silently.

## 6. Planned Domain Model

```text
User
- id
- email
- passwordHash
- enabled
- accountLocked
- failedLoginAttempts
- createdAt
- updatedAt

Role
- id
- name

Permission
- id
- name

Task
- id
- title
- description
- status
- ownerId
- teamId
- createdAt
- updatedAt

Team
- id
- name
- managerId

TeamMember
- teamId
- userId

RefreshSession
- id
- userId
- tokenHash
- expiresAt
- revokedAt
- replacedBySessionId
- deviceName
- createdAt
```

We will not create all tables at the beginning. Each structure will be introduced only when its lesson requires it.

## 7. Authorization Policy Examples

```text
TASK_CREATE
Authenticated users may create tasks for themselves.

TASK_READ_OWN
A user may read a task they own.

TASK_UPDATE_OWN
A user may update a task they own.

TASK_READ_TEAM
A manager may read tasks belonging to their managed team.

TASK_DELETE_ANY
An administrator may delete any task.

USER_MANAGE
An administrator may manage user accounts.
```

Roles group permissions; permissions describe capabilities; ownership and team checks evaluate the actual resource.

## 8. Documentation Architecture

```text
docs/
├── ROADMAP.md
├── ARCHITECTURE.md
├── LESSON_TEMPLATE.md
├── modules/
│   ├── 01-authentication-foundations/
│   ├── 02-spring-security-foundations/
│   ├── 03-registration-login/
│   ├── 04-jwt-authentication/
│   ├── 05-authorization/
│   ├── 06-refresh-tokens/
│   ├── 07-production-security/
│   ├── 08-testing-debugging/
│   └── 09-distributed-authentication/
├── diagrams/
└── decisions/
```

Use `decisions/` for short Architecture Decision Records such as:

- Why access tokens are JWTs
- Why refresh tokens are opaque
- Why refresh tokens are stored as hashes
- Why asymmetric signing is introduced later
- Why authorization is not trusted only to the gateway

## 9. Testing Layers

```text
Unit tests
  -> password, token, registration, refresh, and policy services

Spring Security tests
  -> authentication state, endpoint rules, 401, and 403

Repository tests
  -> persistence rules and queries

Integration tests with Testcontainers
  -> full application and PostgreSQL behavior
```

## 10. Final Distributed Architecture

```text
Client
  |
  v
API Gateway
  |
  +---------------------> Authentication Service / Identity Provider
  |                             |
  |                             | issues tokens
  |                             v
  +---------------------> Task Resource Service
  |
  +---------------------> User Administration Service
```

The gateway may authenticate requests, but resource services must not blindly trust arbitrary identity headers from untrusted networks. Trust must be established through validated tokens, mutually authenticated infrastructure, or another explicitly designed mechanism.
