# DevQuest

A local, single-user software engineering learning workspace. Built with Spring Boot, React, TypeScript, and PostgreSQL.

**Current scope: M2.2 — Safe curriculum re-import.** Browse the roadmap, save progress in PostgreSQL, and export or preview an updated Markdown roadmap from Data safety. Supported changes require explicit confirmation. See [M2.2 verification](docs/M2_2_VERIFICATION.md) for matching rules and test results.

## Stack

| Component | Version / choice |
| --- | --- |
| Java | 25.0.3 (approved installed version) |
| Spring Boot | 4.1.0 |
| Maven | 3.9.16, pinned by the Maven wrapper |
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| Database | Native PostgreSQL, dedicated `devquest_db` |
| Migrations | Spring Boot Flyway starter + PostgreSQL-specific Flyway module |
| Tests | JUnit, Mockito, real PostgreSQL integration tests; Vitest + Testing Library |

## Repository

```text
backend/       Spring Boot application (com.ekrem.devquest)
frontend/      React shell, roadmap routes, and progress controls
curriculum/    Original learning documents; unchanged
scripts/       Native Windows PostgreSQL lifecycle and environment helpers
docs/          Setup and verification documentation
```

Start with [Windows development instructions](docs/WINDOWS_DEVELOPMENT.md). See [M1 implementation and verification](docs/M1_VERIFICATION.md) for the database model, API, progress rules, test evidence, and limitations. [M0 verification](docs/M0_VERIFICATION.md) remains a historical record.

See [M2.1 export verification](docs/M2_1_VERIFICATION.md) for the export endpoint, integrity checks, actual tests, and limitations. Markdown checkboxes represent completed versus not completed; the database retains richer statuses and event history.

## Quick start after local database setup

From the repository root, in PowerShell:

```powershell
.\scripts\Start-LocalPostgres.ps1
. .\scripts\Use-LocalEnvironment.ps1
Set-Location backend
.\mvnw.cmd spring-boot:run
```

In another terminal, from the repository root:

```powershell
Set-Location frontend
npm.cmd ci
npm.cmd run dev
```

Open `http://127.0.0.1:5173`. The frontend proxies `/api` to `http://127.0.0.1:8080`.

Both servers bind to loopback. The managed local PostgreSQL instance also binds to loopback, on port `55432`. No login or public hosting is configured.

## Checks

```powershell
# From backend/, with JAVA_HOME pointing to JDK 25.0.3:
.\mvnw.cmd verify
# With credentials loaded and native PostgreSQL running:
.\mvnw.cmd -Pintegration verify

# From frontend/:
npm.cmd test
npm.cmd run build
```

Integration tests use `devquest_test_db` and its own non-superuser role. They never use `devquest_db` or the separate educational project's database.

On startup, Flyway applies pending migrations. An empty curriculum database is seeded from `curriculum/ROADMAP.md` in one transaction. After seeding, PostgreSQL supplies the current revision on startup. Use Data safety to preview and confirm source changes. Run the backend from `backend/` so the default seed path resolves correctly.

Do not commit local credentials, build artifacts, database files, or `.local/`. The curriculum files remain unchanged. DevQuest does not access or modify `secure-task-api`. Authentication, gamification, and synchronization are outside this scope.
