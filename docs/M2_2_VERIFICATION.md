# M2.2 · Safe curriculum re-import

Verified November 23–24, 2026, on Windows 11 with native PostgreSQL. The browser used the running React and Spring Boot applications and the isolated `devquest_test_db`.

## Workflow and safeguards

Open **Data safety → Import updated roadmap**, choose a UTF-8 `.md` file, and select **Preview changes**. The preview shows proposed totals, the current revision, a checksum, change groups, and explanations for conflicts. A supported preview requires an explicit confirmation checkbox before applying.

Preview does not write to PostgreSQL. Apply checks the stored preview, source SHA-256, current revision, and active progress versions and statuses. It takes the same curriculum lock used by progress updates. A single transaction saves the source and mappings, initializes new progress, retires removed items, and selects the new current revision. Existing progress and events are preserved. Identical bytes produce no database changes.

| Change | Outcome |
| --- | --- |
| Same label under the same section hierarchy, unique there | Keeps the original item ID and progress, including after a reorder. |
| Exact label moved between existing sections of the same kind | Keeps the original ID when the label is unique across both revisions. |
| Repeated labels | Separate section paths keep occurrences independent. Repeats within one section use their ordinal only when the section's ordered labels are unchanged. |
| Checkbox edited for an existing item | Reports the marker change and any progress conflict. PostgreSQL remains authoritative. |
| Unmatched additions only | Creates new IDs and initializes checkbox state without a completion timestamp or progress event. |
| Unmatched removals only | Retires items and keeps their stored progress, events, and historical mappings. |
| Possible rename, uncertain move, ambiguous duplicate, or retired label reintroduced | Blocks apply and explains the unresolved identity. |

Keep existing wording when possible. The matcher blocks combined unmatched removals and additions because it cannot reliably distinguish a rename from two independent edits. Ambiguous section title changes can also block apply. There is no manual mapping editor or revision restore screen. Earlier accepted source and mappings remain in PostgreSQL. Markdown export reflects the current accepted revision and cannot encode all four progress states or event history.

Uploads are bounded to 512 KiB, 10,000 lines, 500 sections, and 5,000 checklist items. The roadmap parser expects the established headings and flat, single-line checkboxes. Invalid UTF-8, malformed structure, unsafe filenames, and oversized bodies are rejected. Uploaded bytes are never written to a filesystem path by the backend. The UI renders change text as text. Up to ten previews are held in memory for ten minutes. Expiry, eviction, or restart requires a new preview.

## API and migration

| Method and path | Result |
| --- | --- |
| POST `/api/curriculum/{id}/import-previews` | Accepts JSON with `filename` and `contentBase64`, returns the structured preview. |
| GET `/api/import-previews/{id}` | Reads the cached preview. |
| POST `/api/import-previews/{id}/apply` | Requires `confirmed: true` and `sourceSha256`, returns the accepted revision ID and whether the source was unchanged. |

Validation errors use 400, stale or blocked applies and checksum mismatches use 409, unavailable previews use 410, and oversized bodies use 413. The existing local mutation controls apply to both POST routes.

`V3__revision_history_and_retirement.sql` adds the current revision pointer, persistent section identities, revision-scoped item mappings, and retirement timestamps. It backfills existing mappings from V2. Flyway applied V3 successfully to `devquest_test_db`. No test migration or import was run on `devquest_db`. Normal backend startup applies pending Flyway migrations.

## Results

| Check | Actual result |
| --- | --- |
| Backend `mvnw.cmd -B -Pintegration verify` | Build passed. 10 unit and 27 PostgreSQL integration tests passed, including 12 import tests. |
| Frontend `npm.cmd test` | 27 passed in four files, including nine import UI tests. |
| Frontend `npm.cmd run build` | TypeScript and Vite production build passed. |
| Browser, blocked rename | The changed label appeared under possible renames or modifications and no apply control was present. |
| Browser, safe addition | Proposed total 890. Apply remained disabled until confirmation. Before confirmation, PostgreSQL still had one revision, 889 mappings, and zero events. |
| PostgreSQL after browser apply | Two revisions, 890 active mappings, zero events. The fingerprint of all 889 pre-existing progress rows matched the baseline. |
| Browser, restart and export | Restarted Spring Boot still served 890 items and 25 completions. Identical source confirmation reported no changes. Downloaded Markdown included the new unchecked item. |
| Responsive layout | Verified 390 px and 1280 px browser viewports with no horizontal page overflow. |
| Cleanup | Removed the identified browser fixture from the test database and verified the original revision, 889 mappings, zero events, and matching progress fingerprint. Verification servers stopped. |

The last read of the live development database before verification showed 11 modules, 76 sessions, 889 checklist items, 25 completed, 864 not started, zero in progress, zero needing review, zero events, and one revision. Browser tests left that database untouched. All three original curriculum files retained their original SHA-256 hashes.

Automatic review initially stopped the verification server launch because the usage limit prevented review. The retry succeeded. Existing passing test runs were reused because application code did not change during the browser verification.

## Files changed

- Backend API under `curriculum/api`: `CurriculumImportController.java`, `ImportDtos.java`, `ImportSizeFilter.java`, and `CurriculumErrors.java`.
- Backend services under `curriculum/application`: `CurriculumImportService.java`, `CurriculumReconciler.java`, `ImportProblem.java`, `CurriculumImporter.java`, `CurriculumReader.java`, `CurriculumStartup.java`, `MarkdownExportService.java`, `ProgressService.java`, and `RoadmapParser.java`.
- Persistence and tests: `V3__revision_history_and_retirement.sql`, `FoundationIT.java`, and `CurriculumImportIT.java`.
- Frontend Data Safety feature: `DataSafetyPage.tsx`, `data-safety.css`, `ImportRoadmap.tsx`, `import.ts`, and `ImportRoadmap.test.tsx`.
- Documentation: `README.md`, `docs/WINDOWS_DEVELOPMENT.md`, and this report.

Suggested commit message: `feat: preview and apply safe curriculum re-imports`.
