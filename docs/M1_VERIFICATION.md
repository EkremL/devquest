# M1 — Interactive roadmap and persistent progress

Verified on **2026-11-23**, Europe/Istanbul. Scope stops at M1. No commits or pushes were made.

## Delivered workflow

The Roadmap navigation opens all 11 modules in source order. Module pages expose their sessions and independent module-completion requirements. Session pages expose every topic with Not started, In progress, Needs review, and Completed states. Final competencies have their own route, outside Module 10. Breadcrumbs, direct module/session links, topic anchors, mobile navigation, keyboard-accessible native controls, loading/error/retry states, saving feedback, and conflict handling are implemented.

Users select a status and press Save. The displayed persisted status and aggregates update after the server confirms the write; selecting an option alone does not modify PostgreSQL. The existing M0 health dashboard and backend health endpoint remain functional. Theme colors, gradients, typography, and reduced-motion behavior reuse the existing tokens.

## Actual import

Counts were recalculated from the unchanged file before implementation; every expected value matched.

| Category | Count | Initially completed |
| --- | ---: | ---: |
| Modules | 11 | Not automatically completed |
| Sessions | 76 | Not automatically completed |
| Session checklist items | 805 | 25 |
| Module-completion requirements | 67 | 0 |
| Final competencies | 17 | 0 |
| All checklist items | 889 | 25 |

There are 98 structural nodes: one root, 11 modules, 76 sessions, nine module-completion sections, and one final-competency section. Modules 0 and 10 have no separate completion requirements in the source. Module 10 contains 30 items; the 17 final competencies are not attached to it.

After importing into **devquest_db**, every one of the 889 API labels, source order positions, and initial states was compared with the Markdown and matched. The database contained 889 identity mappings, 25 completed items, zero progress events, and zero fabricated completion timestamps. The test database was restored to the same baseline after browser verification.

Source SHA-256: `A67BC6BA3D6D1CC5D0D9D54B5CB891CC21CD6B9A4002EEADCAD76DB28C1C1399`.

The SHA-256 values of `curriculum/ROADMAP.md`, `curriculum/reference/ARCHITECTURE.md`, and `curriculum/reference/LESSON_TEMPLATE.md` match their pre-implementation baselines. No curriculum files or separate secure-task-api files were changed.

## Model and import decisions

V1 remains unchanged. **V2__curriculum_and_progress.sql** adds seven tables in the existing `devquest` schema:

| Table | Responsibility |
| --- | --- |
| curriculum | Stable curriculum identity and source key |
| curriculum_revision | Accepted revision, SHA-256, original Markdown snapshot, import time |
| curriculum_node | Ordered headings and parent-child hierarchy, stable UUIDs |
| checklist_item | Independent UUID for every occurrence, exact label, order, original checkbox state |
| source_item_mapping | Stable item-to-revision occurrence mapping and diagnostic source line |
| item_progress | Current four-state progress, optimistic version, update/completion timestamps |
| progress_event | Actual state transitions, version, and event time |

Foreign keys, unique ordering/mapping/event constraints, status checks, nonnegative versions, and parent/event indexes enforce core integrity. Line numbers and labels are metadata, not permanent identifiers. Identical labels retain separate UUIDs, progress rows, and events.

The immutable curriculum is imported and read with parameterized JdbcTemplate queries; the mutable progress aggregate uses Spring Data JPA and `@Version`. This avoids a large mutable JPA relationship graph for a read-only source snapshot. DTOs and parser models are Lombok-based classes, not records. Controllers delegate to application services. Reads use three bounded queries in a repeatable-read transaction so their statistics describe one database snapshot.

CommonMark builds the structural syntax tree. Source spans retain exact labels, including inline backticks and Unicode. M1 supports the actual roadmap's headings and flat, single-line checklist format; unknown blocks, nested/multiline tasks, or incorrect baseline counts fail before import. The entire original Markdown is retained in the revision, including introductory paragraphs.

Startup reads `../curriculum/ROADMAP.md` relative to `backend/`. The first import is atomic and takes a PostgreSQL transaction advisory lock to serialize concurrent initial imports. Random UUIDs are generated only for the first accepted import and persisted in the mappings. Matching source bytes return without rewriting any rows. Changed source bytes, including line-ending-only changes, stop startup with a reconciliation-required message; existing progress remains intact. M1 deliberately allows only one accepted revision per curriculum. There is no upload/import HTTP endpoint and no automatic reconciliation.

Imported completed items have `completed_at = NULL`; their historical completion date is unknown. Import time is recorded as import/update metadata, not represented as learning activity. Imported items generate no progress events.

## Progress rules

- Each item can move explicitly between any of the four statuses. There are no inferred completions or automatic parent updates.
- `percentage = round(100 × completed / total, 1 decimal place)`. Empty categories return 0%, never 100%.
- Session progress counts only its session topics. Module topic progress counts all descendant session topics. Module requirements use a separate denominator and count. Final competencies use their own 17-item denominator.
- Module cards show the total number of checklist items, a **session-topic** percentage and status, and separate completed/total module requirements. The topic badge is not a certification that module requirements are complete.
- Aggregate indication: Completed when all nonempty items in that category are completed; otherwise Needs review when any require review; otherwise In progress when any are in progress or completed; otherwise Not started.
- An update includes the current version. Stale versions return HTTP 409, including replays of an old successful request. Repeating the current status with the current version is a successful no-op: no version increment or event. Thus retries cannot create duplicate activity.
- A real change and its event commit together. JPA optimistic locking rejects concurrent losers. Entering Completed records the current time; leaving it clears the current completion timestamp. Prior changes remain in the event history.
- The frontend refetches authoritative data after success or failure. A conflict asks the user to review the latest state and choose again. No optimistic success is shown.
- Future Markdown export must check only COMPLETED. Export itself is not part of M1.

## REST API

All responses are DTOs. IDs are UUIDs. Existing `GET /api/health` is unchanged.

| Method | Path | Result |
| --- | --- | --- |
| GET | /api/curriculum | Revision metadata and ordered tree with items, progress, and category statistics |
| GET | /api/curriculum/statistics | Separate topic, requirement, and competency statistics |
| GET | /api/modules | Ordered modules |
| GET | /api/modules/{id} | Module, sessions, and requirements |
| GET | /api/modules/{id}/requirements | Separate module requirement items; empty when none exist |
| GET | /api/sessions | Ordered sessions |
| GET | /api/sessions/{id} | Session and topics |
| GET | /api/sessions/{id}/topics | Ordered session checklist |
| GET | /api/final-competencies | Dedicated final section and items |
| PATCH | /api/items/{id}/progress | Confirmed persisted progress |

PATCH body example (use the version returned by a read):

```json
{ "status": "IN_PROGRESS", "version": 0 }
```

Mutation headers: `Content-Type: application/json`, `X-DevQuest-Request: 1`. Browser Origins are limited to localhost/127.0.0.1 on ports 5173, 4173, and 8080. A cross-site Fetch Metadata header, foreign Origin, non-loopback Host, or missing custom header is rejected. No CORS grants, accounts, sessions, or JWTs were added. These controls prevent unintended browser cross-origin writes; they do not authenticate other programs on this personal computer. All three service listeners were verified on `127.0.0.1` only.

Errors include `INVALID_REQUEST` (400), `NOT_FOUND` (404), `PROGRESS_CONFLICT` (409), and `LOCAL_REQUEST_REQUIRED` (403), with safe user-facing messages. API responses disable caching.

## Executed checks and results

| Check | Actual result |
| --- | --- |
| Maven unit tests | 6 passed: existing 3 M0 tests and 3 parser tests |
| Native PostgreSQL integration tests | 10 passed: 8 curriculum tests and 2 foundation tests |
| Backend package / verify | Passed; executable JAR built |
| Frontend Vitest suite | 11 passed: existing 4 M0 checks and 7 roadmap checks |
| TypeScript / Vite production build | Passed |
| Dependency installation audit | 0 vulnerabilities reported by npm at installation |
| All nine curriculum read endpoints | HTTP 200 with JSON against PostgreSQL |
| Real concurrent PATCH requests | One 200, one 409; exactly one event; stale replay remained 409 |
| Identical import | No changes to progress, events, or stable identities |
| Changed-source import | Rejected without replacing the accepted revision |
| Duplicate labels | Four distinct Key rotation occurrences; updating one did not change another |
| HTTP validation | Invalid UUID/state/version/missing fields rejected; nonexistent UUID returned 404 |
| Cross-origin controls | Missing custom header and foreign Origin rejected with 403 |
| Browser navigation | Roadmap → Module 0 → Session 0.2; direct session reload; module requirements and final competencies verified |
| Browser mutation | Real PATCH saved IN_PROGRESS and refreshed statistics; confirmed after full service restart |
| Browser M0 regression | Overview showed Workspace connected with real backend health |
| Responsive checks | Session views inspected at 1440px and 390px; session and roadmap at 320px; roadmap at actual 1280px; checked no horizontal document overflow at measured widths |
| Mobile regression fix | Corrected stylesheet precedence so Overview/Roadmap navigation remains visible below 800px |
| Browser console | Final inspected tab returned no warning/error entries |
| Source/data integrity | All 889 real API labels/order/statuses matched source; all three curriculum hashes unchanged |
| Credential scan | Zero matches for any of the three actual local passwords in tracked or nonignored files |
| Git artifact check | No credentials, local properties, database directories, target/dist/node_modules, or .local files tracked |

The first new frontend test run exposed a test assertion that did not wait for the asynchronous saving state; the next run exposed a mock response that reused the same object reference rather than behaving like JSON deserialization. Both test fixtures were corrected, and all final tests passed. The mobile navigation issue was a real CSS ordering problem and was fixed before final verification.

Lombok emits an Unsafe API warning under Java 25, and Mockito emits a dynamic-agent warning. They do not fail the current build; future JDK upgrades may require tool updates. No warnings were suppressed to disguise failures.

### Restart evidence

Browser write verification used **devquest_test_db**, never the real learning database. The Configure PostgreSQL test occurrence moved from NOT_STARTED/version 0 to IN_PROGRESS/version 1 through the UI. Full ordered JSON snapshots of every progress row, every event, and Flyway history were saved before and after restarting the dedicated native PostgreSQL process; they matched exactly. The backend and Vite processes were also restarted, and a direct session page reload still showed IN_PROGRESS.

The isolated test item and its single test event were then restored to the original fixture. The test database again held 25 completed items and zero activity events. The full integration suite was rerun successfully. Normal `devquest_db` import was checked separately and retained the original 25 completions with zero events. Windows itself was not rebooted.

Local evidence is ignored by Git: `.local/m1-backend-final.log`, restart JSON snapshots, `.local/verification/m1-mobile-test-progress.jpg`, and `.local/verification/m1-roadmap-desktop.jpg`. A requested 768px browser override did not reliably take effect; no 768px verification is claimed. Actual measured 1280px and narrow-screen widths are reported above.

## Files created and modified

Created:

```text
backend/src/main/java/com/ekrem/devquest/curriculum/
  api/
    CurriculumController.java
    CurriculumDtos.java
    CurriculumErrors.java
    LocalMutationFilter.java
  application/
    CurriculumImporter.java
    CurriculumReader.java
    CurriculumStartup.java
    ProgressService.java
    RoadmapParser.java
  domain/
    ItemProgress.java
    ProgressStatus.java
  persistence/
    ProgressRepository.java
backend/src/main/resources/db/migration/V2__curriculum_and_progress.sql
backend/src/test/java/com/ekrem/devquest/curriculum/
  CurriculumIT.java
  RoadmapParserTest.java
frontend/src/Overview.tsx
frontend/src/features/curriculum/
  api.ts
  RoadmapPage.tsx
  RoadmapPage.test.tsx
  roadmap.css
docs/M1_VERIFICATION.md
```

Modified: `backend/pom.xml` (CommonMark dependency); `FoundationIT.java` (V2/schema expectations); `frontend/package.json` and lockfile (Router and Query); `App.tsx` (shared shell/routes); `App.test.tsx` (browser scroll stub); `theme.css` (progress-token comment); `frontend/THEME.md`, `README.md`, and `docs/WINDOWS_DEVELOPMENT.md` (current functionality and runbook).

The M0 overview markup and health logic were extracted to Overview.tsx, with the former planned-roadmap card now linking to the functional page. Existing application properties, Vite proxy configuration, credential examples, database lifecycle scripts, V1, and curriculum content were not modified. The historical M0 report remains unchanged.

## Exact Windows startup commands

After restarting Windows, use normal PowerShell terminals. Do not initialize PostgreSQL again.

Terminal 1:

```powershell
Set-Location 'C:\Users\ekrem\OneDrive\Masaüstü\devquest'
.\scripts\Start-LocalPostgres.ps1
. .\scripts\Use-LocalEnvironment.ps1
Set-Location backend
.\mvnw.cmd spring-boot:run
```

Terminal 2:

```powershell
Set-Location 'C:\Users\ekrem\OneDrive\Masaüstü\devquest\frontend'
npm.cmd ci
npm.cmd run dev
```

Open `http://127.0.0.1:5173/roadmap`. `npm ci` is needed after dependency changes or a fresh checkout, not every ordinary startup. Keep both terminals open. PostgreSQL is a user-owned process, not an automatically starting Windows service; its data and encrypted credentials remain under `%LOCALAPPDATA%\DevQuest\PostgreSQL`, outside OneDrive.

At handoff, the hidden backend and frontend verification processes were stopped so these commands can start normally without port conflicts. The existing PostgreSQL instance was left running on `127.0.0.1:55432`; the start script safely detects an already-running instance. No listeners remained on 8080 or 5173.

Stop frontend/backend with Ctrl+C. To stop the database afterward:

```powershell
Set-Location 'C:\Users\ekrem\OneDrive\Masaüstü\devquest'
.\scripts\Stop-LocalPostgres.ps1
```

Repeat the checks:

```powershell
# Repository root
.\scripts\Start-LocalPostgres.ps1
. .\scripts\Use-LocalEnvironment.ps1
Set-Location backend
.\mvnw.cmd -B -Pintegration verify
Set-Location ..\frontend
npm.cmd test
npm.cmd run build
```

Commands actually used during this milestone additionally included `npm.cmd install react-router@7 @tanstack/react-query@5`, `java -jar target/devquest-0.0.1-SNAPSHOT.jar`, `psql` read/fixture-cleanup queries against the named DevQuest databases, the existing start/stop scripts, `Invoke-RestMethod` health/curriculum checks, `Get-NetTCPConnection`, curriculum SHA-256 checks, and `git status/diff/ls-files`. Background verification processes used hidden windows and process-local credentials; no password was passed as a command-line argument.

## Limits and next review

M1 intentionally does not include source reconciliation, Markdown export, notes/lesson editing, history browsing, gamification, authentication, AI review, GitHub synchronization, or simulations. Plain text safely displays the original item labels, including inline Markdown markers. The frontend caches one complete curriculum tree rather than paginating this small personal roadmap; large future curricula may need narrower read queries. There is no offline mutation queue. Keep the source file available when starting the backend; a changed or missing source stops startup safely.

Review module navigation and a genuine progress change locally before approving further work. Suggested commit message, for use only after approval:

```text
feat: add interactive curriculum roadmap and persistent progress tracking
```

Implementation references: [CommonMark Java syntax tree and source spans](https://github.com/commonmark/commonmark-java), [TanStack Query queries/mutations/invalidation](https://tanstack.com/query/latest/docs/framework/react/quick-start), and [React Router declarative setup](https://reactrouter.com/start/declarative/installation).
