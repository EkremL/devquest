# Windows development

## Prerequisites

- Windows 11, PowerShell, Git.
- Installed JDK **25.0.3**, as approved during M0. Maven enforces this patch version.
- Maven **3.9.16** via `backend/mvnw.cmd`; a system Maven installation is optional.
- Node.js 22.12+ (tested with Node 24.22.3 and npm 11.19.1).
- Native PostgreSQL. Docker is not required.

Use normal user permissions. None of the scripts install a Windows service, alter firewall rules, or request administrator elevation. If Windows requests administrator permissions, stop and review the operation.

## Every time after restarting Windows

Use two normal PowerShell terminals. Do not rerun the initialization script: the existing database and credentials persist on disk.

**Terminal 1 — start PostgreSQL, load the local environment, run Spring Boot:**

```powershell
Set-Location 'C:\Users\ekrem\OneDrive\Masaüstü\devquest'
.\scripts\Start-LocalPostgres.ps1
. .\scripts\Use-LocalEnvironment.ps1
Set-Location backend
.\mvnw.cmd spring-boot:run
```

Leave this terminal open. Wait for `Started DevQuestApplication` and port 8080. The database runs independently after `pg_ctl` starts it; Spring Boot occupies this terminal.

**Terminal 2 — run React/Vite:**

```powershell
Set-Location 'C:\Users\ekrem\OneDrive\Masaüstü\devquest\frontend'
npm.cmd run dev
```

Dependencies are already installed. Run `npm.cmd ci` first only on a fresh checkout, after deleting `node_modules`, or when the lockfile changes. Leave the terminal open and visit `http://127.0.0.1:5173`. Use **Check connection**; all three cards should report healthy status.

If you need to verify without opening the browser, use a third terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/api/health
Invoke-RestMethod http://127.0.0.1:5173/api/health
```

To stop, press Ctrl+C in the backend and frontend terminals (confirm termination if `cmd` asks), then run this from the repository root:

```powershell
.\scripts\Stop-LocalPostgres.ps1
```

Do not delete the `data` directory or rerun `initdb`. No administrator terminal is needed. If local execution policy blocks a helper script, use the equivalent explicit `pg_ctl` command documented below and configure the backend environment in IntelliJ or the ignored local properties file; do not change machine-wide execution policy automatically.

## Dedicated native PostgreSQL

M0 uses a separate user-owned instance:

| Setting | Value |
| --- | --- |
| Installation | `%LOCALAPPDATA%\DevQuest\PostgreSQL` |
| Database files | `%LOCALAPPDATA%\DevQuest\PostgreSQL\data` |
| Host | `127.0.0.1` only |
| Port | `55432` |
| Application database / role | `devquest_db` / `devquest_app` |
| Test database / role | `devquest_test_db` / `devquest_test` |
| Cluster administration role | `devquest_admin`, never used by Spring Boot |

This directory must stay outside OneDrive and outside Git. Port 55432 avoids occupying the usual 5432 port that another project may use.

For a new machine, download the Windows x64 **binary ZIP** from the official [PostgreSQL Windows downloads](https://www.postgresql.org/download/windows/) / [EDB binaries](https://www.enterprisedb.com/download-postgresql-binaries) pages. Then, from the repository root:

```powershell
.\scripts\Initialize-LocalPostgres.ps1 -ArchivePath 'C:\path\to\postgresql-binaries.zip'
```

The script refuses an existing installation directory. It extracts native binaries, initializes a UTF-8 cluster, requires SCRAM passwords, binds only to IPv4 loopback, and creates the two dedicated databases. It does not alter an existing PostgreSQL installation or database.

Each role gets a randomly generated password. Credentials are stored as Windows DPAPI-encrypted `*.credential.xml` files beside the data directory; they can be decrypted only by the Windows account that created them on that computer. These are not portable backups. The temporary `initdb` password file is deleted in a `finally` block.

Start and stop the instance explicitly:

```powershell
.\scripts\Start-LocalPostgres.ps1
.\scripts\Stop-LocalPostgres.ps1
```

`pg_ctl` manages PostgreSQL directly. There is no automatic start on Windows login. If startup fails, read `%LOCALAPPDATA%\DevQuest\PostgreSQL\postgresql.log` and check port 55432.

Equivalent direct start command (useful if script execution is restricted):

```powershell
& "$env:LOCALAPPDATA\DevQuest\PostgreSQL\pgsql\bin\pg_ctl.exe" `
  -D "$env:LOCALAPPDATA\DevQuest\PostgreSQL\data" `
  -l "$env:LOCALAPPDATA\DevQuest\PostgreSQL\postgresql.log" -w start
```

## Backend

From the repository root:

```powershell
. .\scripts\Use-LocalEnvironment.ps1
Set-Location backend
.\mvnw.cmd --version
.\mvnw.cmd verify
.\mvnw.cmd spring-boot:run
```

The dot followed by a space loads environment variables into the current PowerShell process. Do not print those variables or paste them into chat. They are inherited by the backend process, not written to Git. The helper sets `JAVA_HOME` explicitly because an Oracle PATH shim may resolve a different Java installation.

The backend must run with `backend/` as its working directory. It listens at `http://127.0.0.1:8080` and exposes:

```text
GET /api/health
```

A healthy response is HTTP 200 with `application: DevQuest`, `status: UP`, `database: UP`, and `migrations: UP`. Dependency failure returns HTTP 503 if the server is still running. Initial database or migration failures prevent startup rather than producing a false success.

Flyway applies V1 (foundation), V2 (curriculum and progress), and V3 (revision history and retirement). On an empty database, the startup importer reads `../curriculum/ROADMAP.md` and validates 889 checklist items with 25 original completions. Override the seed path with `DEVQUEST_CURRICULUM_PATH` if needed. After seeding, startup uses the current PostgreSQL revision. To change it, choose a UTF-8 Markdown file under **Data safety → Import updated roadmap**, preview it, and confirm a supported update. Hibernate uses `ddl-auto=validate`. Flyway clean and automatic baseline are disabled. Applied migrations must never be edited.

Alternative configuration: copy `backend/config/application-local.properties.example` to `backend/config/application-local.properties`, replace placeholders locally, and set `JAVA_HOME`. The real file is ignored by Git, but because this checkout is inside OneDrive it may still sync there. Prefer the DPAPI/environment helper above. No automatic `.env` loader is configured, and no secrets belong in `VITE_*` variables.

## Frontend

In another terminal:

```powershell
Set-Location 'C:\path\to\devquest\frontend'
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd run dev
```

Open `http://127.0.0.1:5173`. Vite uses a same-origin `/api` proxy to the backend; no permissive CORS configuration is needed. Both dev and preview servers use strict ports and bind to `127.0.0.1`. Do not use `--host 0.0.0.0`.

`npm.cmd run preview` serves the production build on `http://127.0.0.1:4173`, with the same API proxy. Preview is a local build check, not a production hosting service.

The connection button performs a real health request. Missing dependencies produce an explicit error or unverified state. Roadmap is functional: open a module, open a session, select a status, and press Save. A status is saved only after the backend confirms it. Module requirements and final competencies have their own controls. Lesson workspace and security lab remain future features. Direct module and session URLs work through the Vite development/preview server.

## Markdown export (M2.1)

With both servers running, open `http://127.0.0.1:5173/data-safety` or select **Data safety** in the navigation. Select **Export Roadmap as Markdown** and check your browser's downloads for `ROADMAP.md`. The browser may append a number when that filename already exists. DevQuest does not select the source directory or overwrite the original curriculum.

Only saved COMPLETED items are checked. The other three states are unchecked; full statuses, timestamps, and activity history remain in PostgreSQL. This file is not a database backup. It uses the accepted source revision stored in PostgreSQL, preserving UTF-8 and line endings, and does not read or write the working-tree file during export. Integrity failures stop the download with an error. See `M2_1_VERIFICATION.md` for details. See the Data safety page for import preview and the [Windows recovery guide](WINDOWS_RECOVERY.md) for full database backups.

## IntelliJ IDEA

Open `backend/pom.xml` as a Maven project. Set Project SDK and Maven runner JRE to JDK 25.0.3 and use the Maven wrapper. Enable annotation processing for Lombok. Run `com.ekrem.devquest.DevQuestApplication` with working directory `backend/` and database environment variables, or use the ignored local properties file. Keep secrets out of shared run configurations.

## DataGrip

Create a PostgreSQL data source with host `127.0.0.1`, port `55432`, database `devquest_db`, and user `devquest_app`. Retrieve the local credential privately if needed; do not save it in project files. Test Connection, then inspect the `devquest` schema: Flyway history and seven M1 tables described in `M1_VERIFICATION.md`. Use the database owner role for this application, not the cluster administrator.

## Tests

Unit/API tests do not require a database:

```powershell
Set-Location backend
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-25.0.3'
.\mvnw.cmd verify
```

Real PostgreSQL tests, from the repository root:

```powershell
.\scripts\Start-LocalPostgres.ps1
. .\scripts\Use-LocalEnvironment.ps1
Set-Location backend
.\mvnw.cmd -Pintegration verify
```

The integration profile runs `FoundationIT` and `CurriculumIT` against `devquest_test_db`. It checks migrations, complete import, idempotency, changed-source rejection, independent duplicate labels, status transitions, validation, cross-origin protection, all read endpoints, and concurrent writes. Transactional tests roll back; the concurrent HTTP test restores its dedicated fixture. Keep this database reserved for tests. The suite does not drop databases or clean schemas. A missing database or password causes failure, not a skipped test. The separate manual restart verification is documented in `M1_VERIFICATION.md`.

## Backups and shutdown

Stop backend and frontend with Ctrl+C before stopping PostgreSQL. Keep data files out of file-sync tools. Use the [backup and restore verification commands](WINDOWS_RECOVERY.md) for application backups. Store backups outside this repository; do not assume encrypted credential files can be restored on another machine.

No authentication exists in M1. Keep the application local; network hosting requires a separate security design. Mutation requests require JSON, the `X-DevQuest-Request: 1` header, a loopback Host, and an allowed local Origin when present. No CORS grants are enabled. This is browser cross-origin protection, not protection against other local programs. No commits or pushes are performed by setup scripts.
