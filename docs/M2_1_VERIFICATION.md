# M2.1 — Safe Markdown export

Verified **2026-11-23**, Europe/Istanbul. This sub-milestone is complete; M2.2 and M2.3 have not started. No commit or push was performed.

## Starting state and scope

Git was clean at inspection. M1 was committed as `3437207` (`feat: implement interactive roadmap and persistent progress`). Existing source, import mappings, progress services/events, migrations, tests, UI/theme, and Windows lifecycle scripts were inspected. The three curriculum documents retained their known SHA-256 values; the architecture reference continues to describe the separate secure-task-api project.

The actual application database was read before implementation: 889 mappings, 25 COMPLETED items, 864 NOT_STARTED items, and zero progress events. These were observed values, not a reset to the historical baseline. PostgreSQL was initially stopped and was started with the existing script; no installation, initialization, credential generation, or migration was performed.

## Delivered

- A Data safety route at `/data-safety`, reachable from desktop and mobile navigation.
- Current curriculum title, revision ID, checklist total, and completion count at last refresh.
- **Export Roadmap as Markdown** downloads `ROADMAP.md` through the actual backend.
- Explicit loading, preparing, failure/retry, and download-requested feedback. The UI does not claim the browser has finished writing a file.
- An explanation that only COMPLETED exports checked; the other three statuses export unchecked. Unsaved selections are excluded. Full statuses, timestamps, and activity history remain in PostgreSQL.
- The existing M0/M1 functionality and navy/blue/teal/purple theme are preserved.

## Endpoint and safety model

```text
GET /api/curriculum/{curriculumId}/export
```

The ID comes from the existing curriculum overview response. The endpoint is scoped to a curriculum identity rather than matching by topic name or a hardcoded title.

Successful responses contain UTF-8 Markdown bytes, `Content-Type: text/markdown;charset=UTF-8`, `Content-Disposition: attachment; filename="ROADMAP.md"`, `Cache-Control: no-store`, and `X-Content-Type-Options: nosniff`. Invalid IDs return 400, nonexistent curricula return 404, and integrity failures return 409 with code `EXPORT_INTEGRITY_ERROR`; errors are not returned as downloadable Markdown files.

Export uses a read-only PostgreSQL REPEATABLE READ transaction. The stored source revision and all mapped current statuses are read from one database snapshot. It does not read the working-tree roadmap, write a file on the backend, update progress, or create activity events.

The renderer verifies that the UTF-8 encoding of the stored source matches its original SHA-256. CommonMark identifies real checklist list items, ignoring checkbox-looking text inside code fences. Stable persisted item UUIDs join progress to source mappings. The renderer checks the item count, distinct identities, occurrence order, source lines, exact labels, and presence of progress. Missing/inconsistent data stops export instead of producing a partial file.

It then replaces only the single checkbox-state character at each verified source position: `x` for COMPLETED and a space for every other state. It does not reconstruct or re-render the document. Headings, prose, punctuation, duplicate labels, whitespace, inline markup, and all other characters remain intact. LF, CRLF, mixed endings, optional UTF-8 BOM, and final-newline presence are preserved by retaining offsets into the source string. Uppercase `X` completion markers are intentionally normalized to lowercase `x`.

M1 stores decoded UTF-8 text rather than arbitrary original encoding bytes. Export guarantees faithful UTF-8 round-tripping when the source checksum matches; it refuses a checksum mismatch instead of claiming fidelity for a lossy/non-UTF-8 import. The current accepted source is UTF-8 with LF endings.

The frontend downloads the returned Blob without decoding/re-encoding its text. It rejects failed HTTP responses, unexpected MIME types, and empty files. The temporary object URL is released after a short download grace period. It never chooses the original curriculum directory as a destination. Normal browser download naming/save behavior applies.

No database tables, migrations, dependencies, credentials, environment settings, or server bindings changed. Flyway remains at V2. Both application servers and PostgreSQL were verified on loopback only during verification.

## Executed verification

| Check | Actual result |
| --- | --- |
| Backend unit tests | 10 passed: 6 existing + 4 export-renderer tests |
| Native PostgreSQL integration tests | 15 passed: 10 existing + 5 export tests |
| Backend Maven package/verify | Passed; executable JAR built |
| Frontend tests | 18 passed: 11 existing + 7 export tests |
| TypeScript and Vite production build | Passed |
| Real browser download | Saved `C:\Users\ekrem\Downloads\ROADMAP.md` |
| Download bytes | 32,345 bytes, 889 checkboxes, 25 completed, LF endings |
| Download SHA-256 | Identical to original source for the current unchanged checkbox state |
| Live database comparison | Revision, item, mapping, progress, and event snapshots identical before/after |
| Original curriculum | All three file hashes unchanged |
| Browser layout | Inspected at actual 1280px and 390px; no horizontal document overflow |
| Browser console | No error/warning entries returned on the inspected tab |

Backend tests verify duplicate-label independence, all four progress states, syntactically parseable exported curriculum and ordering, non-checklist text preservation, CRLF/LF/mixed endings, BOM, trailing-newline behavior, malformed/missing mappings, checksum mismatch, HTTP download headers/errors, and unchanged source/progress/events/mappings. A PostgreSQL test commits an update from another transaction: the existing repeatable-read snapshot remains unchanged, while the next export transaction sees the committed status. Its dedicated test fixture is restored afterward. Other mutation fixtures roll back. No real application progress was changed for testing.

Frontend tests verify the download action and filename, backend error presentation and deliberate retry, disabled controls during loading/preparation, absence of premature success, metadata-load retry, and rejection of empty, unexpected-type, and failed network responses. M0/M1 tests also pass. Import-preview/conflict-confirmation tests belong to M2.2 and were not claimed or implemented here.

The real browser file and `curriculum/ROADMAP.md` both have SHA-256:

```text
A67BC6BA3D6D1CC5D0D9D54B5CB891CC21CD6B9A4002EEADCAD76DB28C1C1399
```

A byte-identical result is expected for this particular current database state. Tests separately changed statuses in the test database to prove that exports follow PostgreSQL rather than simply returning the original checkboxes.

Verification evidence:

- Ignored build log: `.local/m21-backend.log`.
- Ignored screenshots: `.local/verification/m21-export-desktop.jpg` and `m21-export-mobile.jpg`.
- Read-only integrity snapshots: `%LOCALAPPDATA%\DevQuest\Verification\M2.1\m21-before.json` and `m21-after.json`, moved outside the repository and OneDrive. These comparison artifacts are not a complete/restorable database backup.
- The browser download remains in Downloads for review.

All temporary verification services were stopped afterward, restoring their initial stopped state. Use the normal Windows startup commands before reviewing the UI. Existing Java 25 Lombok/Mockito runtime warnings remain non-failing; no warnings were hidden to claim success.

## Files changed

Created:

```text
backend/src/main/java/com/ekrem/devquest/curriculum/api/MarkdownExportController.java
backend/src/main/java/com/ekrem/devquest/curriculum/application/MarkdownExportService.java
backend/src/main/java/com/ekrem/devquest/curriculum/application/MarkdownExportRenderer.java
backend/src/test/java/com/ekrem/devquest/curriculum/MarkdownExportIT.java
backend/src/test/java/com/ekrem/devquest/curriculum/MarkdownExportRendererTest.java
frontend/src/features/data-safety/DataSafetyPage.tsx
frontend/src/features/data-safety/DataSafetyPage.test.tsx
frontend/src/features/data-safety/export.ts
frontend/src/features/data-safety/data-safety.css
docs/M2_1_VERIFICATION.md
```

Modified:

```text
backend/src/main/java/com/ekrem/devquest/curriculum/api/CurriculumErrors.java
frontend/src/App.tsx
README.md
docs/WINDOWS_DEVELOPMENT.md
```

The original curriculum, previous migrations, importer, progress-update logic, Windows scripts, environment configuration, package manifests/lockfile, and separate educational repository were not modified.

## Commands and review

Executed from the repository using the existing credential-loading helper:

```powershell
.\scripts\Start-LocalPostgres.ps1
. .\scripts\Use-LocalEnvironment.ps1
# From backend/:
.\mvnw.cmd -B -Pintegration verify
# From frontend/:
npm.cmd test
npm.cmd run build
```

The packaged backend and Vite were launched in hidden windows for browser verification and then stopped. Read-only `psql` queries recorded the real baseline and compared it after export. `Get-FileHash`, Git inspection, and loopback listener checks were also executed. Credentials were passed only through process environment variables, never command-line arguments or reports.

To review, follow [Windows startup instructions](WINDOWS_DEVELOPMENT.md) and open `http://127.0.0.1:5173/data-safety`. The downloaded file can also be inspected directly in Downloads. No automated action writes it back to the source file or publishes it.

Suggested commit message, only after approval:

```text
feat: add safe Markdown roadmap export
```

## Limits and next step

Markdown contains binary completion markers, not the four-state progress model, completion dates, events, or future notes. It is not a backup. Existing M1 behavior still rejects changed-source imports on startup; exporting does not reconcile or replace a revision. The full import-preview workflow and its manual conflict resolutions remain M2.2. Backup/recovery instructions and rehearsal remain M2.3. The Data safety page is intentionally limited to the usable export workflow for this review.

Exports represent a consistent point in time; an update committed afterward belongs in the next download. The metadata summary is labeled as the last refresh and can differ from a newer download. The browser controls the final save location and may rename repeated downloads. No public hosting/authentication was added; keep the application local.

Wait for user review before starting M2.2.

Technical references: [PostgreSQL repeatable-read snapshots](https://www.postgresql.org/docs/18/transaction-iso.html) and [browser Blob URLs and lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static).
