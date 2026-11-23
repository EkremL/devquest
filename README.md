# DevQuest

A local, single-user software engineering learning workspace. Built with Spring Boot, React, TypeScript, and PostgreSQL.

**Current scope: M0 — Foundation.** The application shell checks real backend, database, and Flyway health. Curriculum import and progress tracking begin in M1 and are not implemented here.

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
frontend/      React application shell
curriculum/    Original learning documents; unchanged
scripts/       Native Windows PostgreSQL lifecycle and environment helpers
docs/          Setup and verification documentation
```

Start with [Windows development instructions](docs/WINDOWS_DEVELOPMENT.md). See [M0 verification](docs/M0_VERIFICATION.md) for actual validation results and limitations.

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

Do not commit local credentials, build artifacts, database files, or `.local/`. No data is imported from `curriculum/` in M0. DevQuest does not access or modify `secure-task-api`.
