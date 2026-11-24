# M3.2 verification · Learning Dashboard

Overview now shows learning statistics, a suggested next session, module progress, in-progress and review work, and recent saved activity. The existing Workspace connection panel remains available below the learning sections.

## Data and behavior

- `GET /api/curriculum` supplies the active hierarchy and saved progress shared with the Roadmap and Skill Atlas. Percentages use the server's calculation of completed divided by total, rounded to one decimal place. Module cards count only session topics. Module requirements and final competencies have their own denominators.
- Continue Learning considers session topics in curriculum order. It selects the first in-progress topic, then the first marked for review, then the earliest unfinished topic. The UI identifies it as a suggestion. If there is no unfinished topic, it distinguishes completed and empty curricula. Learning Focus shows the remaining topic count for the suggested module and links to in-progress and review sessions.
- New read-only `GET /api/curriculum/activity` returns at most 12 newest genuine progress events for items in the active source mapping. One query resolves titles and stable section IDs without loading Markdown. Older events are retained in PostgreSQL. Events for retired items are omitted from this view so links remain actionable. Imported completions appear in the statistics and do not generate events.
- Dashboard refresh reloads curriculum and activity. A failed refresh can show the last loaded data with an explicit message. There are no database migrations or changes to progress persistence.

## Files

- `frontend/src/Overview.tsx` renders the dashboard.
- `frontend/src/features/dashboard/model.ts`, `dashboard.css`, `WorkspaceConnection.tsx` and `Overview.test.tsx` implement its recommendation, theme, retained connection panel, and focused tests.
- `frontend/src/features/curriculum/api.ts` adds the typed activity client. `frontend/src/App.test.tsx` keeps the health checks on the extracted connection panel.
- `CurriculumController.java`, `ActivityEntry.java`, and `ActivityReader.java` expose the read-only activity query. `CurriculumIT.java` tests it against PostgreSQL with rolled back progress transitions.

## Results

| Check | Actual result |
| --- | --- |
| Focused frontend | 5 tests passed for category separation, recommendation order, module/session links, activity, refresh, loading/error and retry. |
| Focused backend | 1 PostgreSQL activity integration test passed. A baseline completion contributed no event, two saved transitions appeared newest first with current links, and reading did not add events. |
| Frontend regression and build | 37 tests passed, TypeScript and Vite production build succeeded. |
| Backend regression and build | 10 unit and 28 PostgreSQL integration tests passed. Maven build succeeded. |
| Browser, 1440, 1280, 768, 390 px | All four widths fit without horizontal overflow. The 390 px suggested-session action measured 44 px tall and opened Session 0.2 using Enter. Module 0, Skill Atlas, and Data Safety routes opened successfully. The Markdown export control was enabled. |
| Browser, restart and refresh | The same totals reloaded after restarting the read-only Spring Boot process. Refresh retained keyboard focus. |
| Isolated database snapshot | 11 modules, 76 sessions, 805 session topics, 25 completed (3.1%), zero in progress and zero needing review. Module requirements 0/67 and final competencies 0/17. The browser displayed “No recorded activity yet.” |

Browser verification used `devquest_test_db` with read-only transactions. Nonempty activity was verified in automated tests using isolated data. The live database was untouched. Mobile was checked in a browser viewport. There is no browsing history, and the recent list is bounded rather than a full activity archive.

Screenshots are under ignored `.local/verification/` as `m32-desktop.jpg` and `m32-mobile.jpg`.

Suggested commit message: `feat: add learning dashboard and saved progress activity`.
