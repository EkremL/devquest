# M0 completion and verification report

Verified on **2026-11-23**, Europe/Istanbul. Scope: **M0 — Foundation only**.

## Outcome

The Spring Boot backend, React frontend, native PostgreSQL connection, Flyway migration infrastructure, and live frontend/backend connection work together. No curriculum import, progress tracking, authentication, gamification, simulation, review center, or GitHub synchronization was implemented.

The approved Java version changed during implementation from 25.0.1 to the already installed **25.0.3**. No additional JDK was installed. Spring Boot remains **4.1.0** and the Maven wrapper pins **3.9.16**. Base package: `com.ekrem.devquest`.

## Actual verification results

| Verification | Actual result |
| --- | --- |
| Maven toolchain enforcement | Java 25.0.3 and Maven 3.9.16 accepted |
| Backend unit/API tests | 3 passed; 0 failed, errored, or skipped |
| Native PostgreSQL integration tests | 2 passed; 0 failed, errored, or skipped |
| Backend executable JAR build | Passed |
| Frontend tests | 4 passed |
| TypeScript and Vite production build | Passed, including a rebuild after the narrow-screen CSS fix |
| npm install audit | 0 vulnerabilities reported at installation |
| Direct Spring Boot health | HTTP 200; application, database, migrations healthy |
| Vite `/api/health` proxy | HTTP 200 with the real Spring Boot response |
| Real database outage | Proxy returned HTTP 503; browser showed dependency unavailable, database unavailable, migrations not verified |
| Database recovery | HTTP 200 and healthy browser state after PostgreSQL restart |
| PostgreSQL persistence | Complete Flyway rows identical before/after restart, including timestamps and checksum |
| Backend restart | Documented `mvnw.cmd spring-boot:run` command succeeded; schema already up to date |
| Migration reapplication | 0 migrations executed on repeat; validation passed |
| M0 database scope | Only `flyway_schema_history` exists in the `devquest` schema |
| Network binding | PostgreSQL 55432, backend 8080, frontend 5173 all listened on `127.0.0.1` only |
| Database roles | Application and test roles have no superuser, create-database, or create-role privileges |
| Responsive UI | Checked 320px, 390px, 768px, and 1440px viewport widths |
| Narrow-screen fix | Removed body minimum width that caused overflow with a desktop scrollbar at 320px; no horizontal overflow remained |
| Browser interactions | Home/status anchors and live connection refresh worked; outage/recovery states verified |
| Browser console inspection | No error/warning entries returned during the final inspection |
| Curriculum integrity | All three SHA-256 values match the pre-implementation baseline |
| Secret check | None of the three actual generated passwords appeared in any nonignored project file |
| Git state | No tracked or staged files; all source changes remain uncommitted; no push performed |

The tests were rerun after the interrupted session resumed. PostgreSQL and the backend were actually restarted; **Windows itself was not rebooted**. Persistence in M0 refers to database/schema/migration state. Learning progress does not exist yet and was not fabricated for testing.

After verification, the backend, frontend, and dedicated PostgreSQL process were stopped. No listeners remained on ports 8080, 5173, or 55432. Use the documented startup commands to review the application; the database files and encrypted credentials remain intact.

## Installed local infrastructure

PostgreSQL **18.7**, downloaded from the official EDB binary distribution, runs as a user-owned native process without a Windows service or administrator installation.

- Installation: `C:\Users\ekrem\AppData\Local\DevQuest\PostgreSQL`
- Persistent data: `C:\Users\ekrem\AppData\Local\DevQuest\PostgreSQL\data`
- Listener: `127.0.0.1:55432`
- Application database/role: `devquest_db` / `devquest_app`
- Integration database/role: `devquest_test_db` / `devquest_test`
- Password files: Windows DPAPI-encrypted XML files outside the repository and OneDrive.
- Download archive SHA-256: `74F3740A2E7844118857F297C2067D226F8F2B0652DE96022CE54BB27CD60A79`

The archive hash records the downloaded artifact; the vendor page did not supply an independent checksum for this archive. It is not a claim of independently verified vendor checksum matching.

The `devquest` schema has a Flyway schema-creation history entry and the successful V1 foundation migration. Those are two history rows, not two application migrations. V1 adds a schema comment and no business tables.

## Commands executed

Commands are grouped by purpose; repeated reads and polling are omitted. All application commands used this DevQuest checkout. No commands were run in `secure-task-api`.

```powershell
# Environment and repository inspection
java -version
mvn -version
node --version
npm.cmd --version
Get-Command java,mvn,node,npm,psql,pg_isready -ErrorAction SilentlyContinue
Get-Service *postgres* -ErrorAction SilentlyContinue
Get-NetTCPConnection -State Listen
git status --short
git ls-files
Get-ChildItem curriculum -Recurse -File | Get-FileHash -Algorithm SHA256

# Pin and build the backend (JAVA_HOME explicitly points to JDK 25.0.3)
mvn.cmd -B -f backend/pom.xml org.apache.maven.plugins:maven-wrapper-plugin:3.3.4:wrapper -Dmaven=3.9.16 -Dtype=only-script
# From backend/:
.\mvnw.cmd -B verify
.\mvnw.cmd -B -Pintegration verify
java -jar target/devquest-0.0.1-SNAPSHOT.jar
.\mvnw.cmd -B spring-boot:run

# Frontend, from frontend/
npm.cmd install
npm.cmd test
npm.cmd run build
npm.cmd run dev
npm.cmd ls --depth=0

# Native PostgreSQL, from the repository root
.\scripts\Initialize-LocalPostgres.ps1 -ArchivePath .local/downloads/postgresql.zip
. .\scripts\Use-LocalEnvironment.ps1
.\scripts\Stop-LocalPostgres.ps1
.\scripts\Start-LocalPostgres.ps1
# pg_isready and psql from the installed PostgreSQL bin directory:
pg_isready.exe -h 127.0.0.1 -p 55432
psql.exe -X -w -h 127.0.0.1 -p 55432 -U devquest_app -d devquest_db

# Real API checks
Invoke-RestMethod http://127.0.0.1:8080/api/health
Invoke-RestMethod http://127.0.0.1:5173/api/health
Invoke-WebRequest http://127.0.0.1:5173/api/health -SkipHttpErrorCheck

# Git hygiene (representative paths)
git check-ignore -v .local/downloads/postgresql.zip backend/target/devquest-0.0.1-SNAPSHOT.jar frontend/node_modules/react/package.json frontend/dist/index.html backend/config/application-local.properties
git ls-files --cached --ignored --exclude-standard
git diff --check
```

The ordinary shell's initial `java` shim stalled; using an explicit `JAVA_HOME` and JDK executable resolved it. The initial JDK 25.0.1 download attempt failed DNS resolution and was abandoned when the user approved 25.0.3. Initial sandbox networking also prevented the browser from reaching Vite; launching the same loopback server outside the command sandbox resolved that, without widening the listening address or changing the firewall.

Database verification queries checked `current_database()`, `current_user`, `version()`, `listen_addresses`, role privileges, the complete ordered Flyway history, and the list of application-schema tables. Before/after Flyway snapshots and verification logs are in ignored `.local/` files. Generated passwords were compared in memory against nonignored source files; their values were not printed.

## Project files

All files below were created for M0 except the three existing curriculum documents. Dependency contents, build-output contents, PostgreSQL internal data files, and Git internals are intentionally represented as directories rather than listing thousands of generated files.

```text
C:\Users\ekrem\OneDrive\Masaüstü\devquest\
├── .editorconfig
├── .gitattributes
├── .gitignore
├── README.md
├── backend/
│   ├── .mvn/wrapper/maven-wrapper.properties
│   ├── mvnw
│   ├── mvnw.cmd
│   ├── pom.xml
│   ├── config/application-local.properties.example
│   ├── src/main/java/com/ekrem/devquest/
│   │   ├── DevQuestApplication.java
│   │   └── health/
│   │       ├── api/HealthController.java
│   │       ├── api/HealthResponse.java
│   │       └── application/HealthService.java
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── db/migration/V1__foundation.sql
│   ├── src/test/java/com/ekrem/devquest/
│   │   ├── FoundationIT.java
│   │   └── health/
│   │       ├── HealthControllerTest.java
│   │       └── HealthServiceTest.java
│   └── target/                         [generated; ignored]
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── App.tsx
│   │   ├── App.test.tsx
│   │   ├── main.tsx
│   │   ├── styles.css
│   │   ├── lib/health.ts
│   │   └── test/setup.ts
│   ├── node_modules/                   [generated; ignored]
│   ├── dist/                           [generated; ignored]
│   └── tsconfig.tsbuildinfo            [generated; ignored]
├── curriculum/                         [preserved byte-for-byte]
│   ├── ROADMAP.md
│   └── reference/
│       ├── ARCHITECTURE.md
│       └── LESSON_TEMPLATE.md
├── scripts/
│   ├── Initialize-LocalPostgres.ps1
│   ├── Start-LocalPostgres.ps1
│   ├── Stop-LocalPostgres.ps1
│   └── Use-LocalEnvironment.ps1
├── docs/
│   ├── WINDOWS_DEVELOPMENT.md
│   └── M0_VERIFICATION.md
├── .local/                             [generated; ignored]
│   ├── downloads/
│   ├── verification/                   [browser screenshots]
│   ├── backend-run.log
│   ├── backend-verification.log
│   ├── flyway-before-restart.jsonl
│   └── flyway-after-restart.jsonl
└── .git/                               [Git metadata; untouched]
```

Separate from the repository:

```text
C:\Users\ekrem\AppData\Local\DevQuest\PostgreSQL\
├── pgsql/                              Native binary distribution
├── data/                               Persistent cluster data
├── instance.json                       Nonsecret location/port metadata
├── admin.credential.xml                DPAPI-encrypted administrator credential
├── app.credential.xml                  DPAPI-encrypted application credential
├── test.credential.xml                 DPAPI-encrypted test credential
└── postgresql.log
```

## Remaining limitations

- No functional M0 blocker remains. A full Windows reboot was not performed; explicit database/backend restart and persisted-state verification were performed instead.
- Java 25 emits nonfatal Lombok `Unsafe` and Mockito dynamic-agent warnings. Tests and builds pass. These should be revisited during future toolchain upgrades.
- The native PostgreSQL instance starts manually; there is no Windows service or login task. Follow the restart instructions in `WINDOWS_DEVELOPMENT.md`.
- DPAPI credentials are tied to the current Windows user and machine. They are not portable database backups.
- Responsive verification used the in-app Chromium browser. This is not a complete cross-browser or accessibility audit.
- M0 health status is refreshed on page load or when requested; there is no background monitoring.
- Roadmap, lesson-workspace, and security-lab navigation labels are placeholders. There are no fabricated progress statistics, XP, findings, or test evidence.
- React Router, TanStack Query, shadcn/ui, React Flow, and Recharts are deliberately deferred until features need them.
- All source files are still untracked/uncommitted, including the curriculum that was already untracked before implementation. `git diff --check` therefore cannot substitute for reviewing those new files; they were inspected directly.

## Next step

Review the M0 shell, startup instructions, and verification results. M1 would introduce the safe roadmap import and persistent topic progress, but it has not started and requires the user's next instruction.
