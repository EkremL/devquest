# M3.1.2B verification · Skill Atlas integration

The existing **Skill tree** navigation opens the approved asymmetric Atlas at `/skill-tree`. It runs inside the normal DevQuest shell, with the same sigils, branching session markers, dashed curriculum trail, palette, and selection panel as the prototype. **Focus map** temporarily expands the canvas. **Browse** exposes a keyboard-accessible module and session list before the graph in tab order.

## Integration

- `frontend/src/App.tsx` loads the Atlas on the existing route and removes the prototype entry point. The app continues to use one router.
- `frontend/src/features/skill-tree/SkillAtlas.tsx` and `atlas.css` reuse the prototype renderer, visual language, inspector, and map controls. Selection fits the cluster to the map's measured viewport when changing clusters, selecting from an overview, or choosing a node outside the visible area. Selecting a nearby session leaves the current viewport in place. The selected API ID is reflected in the URL and restored by browser history.
- `frontend/src/features/skill-tree/layout.ts` keeps the approved slots for numbered modules. Rails follow the current order even when a module stays in its original slot. Extra modules receive deterministic slots beyond the original map. Session markers use existing IDs and deterministic branch positions with spacing checks against hubs and earlier markers.
- `frontend/src/features/skill-tree/SkillAtlas.test.tsx` covers stable identity and layout with an added module and session, real route construction, independent progress counts, module/session navigation, refresh, focus mode, the list fallback, Data Safety navigation, and loading/error/retry states.
- Retired the orbital `SkillTreePage.tsx`, `tree.ts`, `skill-tree.css`, and their corresponding tests after exercising the integrated version. The earlier production implementation remains in Git at `c92083c`. The previously untracked standalone prototype source was preserved locally in ignored `.local/m312a-source/`, and the duplicate preview route was removed.

The Atlas reads the active curriculum from `GET /api/curriculum` via the existing shared TanStack Query key. **Refresh progress** refetches that query. The inspector reads saved session-topic percentages and displays module requirements separately. Session branches illuminate only when the underlying session is completed. A curriculum-order segment illuminates only when both neighboring modules' session-topic states are completed. Needs review has an amber icon and a text status. The lines communicate grouping and reading order.

## Results

| Check | Actual result |
| --- | --- |
| Targeted frontend suite | Four tests passed. |
| Frontend regression | All 31 tests passed after removing the obsolete tree. |
| Production build | TypeScript and Vite passed. Atlas loads as a separate route chunk. |
| 1440 × 900 | The integrated map showed 11 hubs and 76 sessions. Verified pan, Fit whole atlas, contextual cluster zoom, keyboard session selection, Roadmap navigation, and Back/Forward. Browser Back restored the same selected session URL. |
| 1280 × 800 | Verified Skill tree sidebar navigation, focus mode, zoom, Exit focus via Escape, and the refresh control. The targeted test independently confirms updated progress after refresh. |
| 390 × 844 | The browse list expanded, selected Session 0.1, and exposed the correct existing Roadmap link. Page width stayed within the viewport. Data Safety opened and enabled its export action against the same API. |
| Data safety | Browser used the existing Spring Boot server on the isolated PostgreSQL test database with read-only transactions. No live database, curriculum, app progress, migration, or backup changes. Backend tests were not needed for this frontend change. |

Screenshots are saved locally under `.local/verification/` as `m312b-desktop-1440.jpg`, `m312b-cluster.jpg`, and `m312b-mobile.jpg`.

At whole-map scale the session markers are intentionally compact. Cluster zoom and Browse are the readable alternatives. Marker spacing is checked, but dense or heavily reordered content can still produce crossing trails or labels near neighboring markers. Mobile was verified in a browser viewport rather than on physical hardware.

Suggested commit message: `feat: integrate the skill atlas into the DevQuest workspace`.
