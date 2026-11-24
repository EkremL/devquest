# M3.1.2C verification · Skill Atlas hardening

The approved asymmetric map, sigils, colors, and selection panel remain in place. The Atlas still uses the shared curriculum API and the current revision. This milestone changed only the Atlas frontend and its tests.

## Refinements and files

- `SkillAtlas.tsx` keeps the return camera associated with the current router history entry and curriculum revision. A sidebar visit opens the overview. Browser Back restores the last map center and zoom after opening a Roadmap session. Resizing and Focus Map center the same map coordinates in the resized pane. Cluster fit and whole-map fit remain explicit controls. No camera animations were added.
- `camera.ts` stores at most twelve recent frames in memory. Frames expire after a full reload and are not reused across revisions.
- `layout.ts` separates geometry from visual progress. Module IDs, positions, and children determine geometry. Marker titles and completion states determine the artwork. The inspector reads full progress directly from the current query result.
- `atlas.css` keeps touch gestures on the canvas, gives mobile browse rows and zoom controls at least 44 px of target height, and preserves visible focus. Browse moves focus to Close when opened and returns it to Browse on Escape or selection. Focus Map removes the covered workspace navigation from keyboard reach until exiting. Session labels are shorter and staggered in the selected cluster. Full titles remain in the panel, the list, and accessible names.
- `SkillAtlas.test.tsx` adds viewport resize/restoration math, measured layout calls during refresh, deterministic growth/reorder/rename fixtures, and keyboard focus assertions. The existing tests still cover refresh, focus, error/retry, and normal Roadmap and Data Safety links.

## Performance and responsive evidence

Before the change, each graph node and the page subscribed to the full React Flow viewport, which includes pan offsets. Progress changes also supplied a new curriculum object to the geometry builder. Nodes now subscribe to a label visibility boolean, and only the map controls subscribe to the rounded zoom percentage. Geometry depends on a structural signature and ignores progress data. In the focused test, a mocked refresh changing module progress from 100% to 50% left the geometry builder at **one call**. No frame-rate or timing benchmark was run.

| Viewport | Browser checks against the read-only PostgreSQL test instance |
| --- | --- |
| 1440 × 900 | 11 hubs and 76 sessions. Whole-map fit showed zero session labels. Authentication Foundations at 198% showed eight labels. Refresh kept the same transform and keyboard focus. Open Session and browser Back restored the exact observed transform `matrix(1.98, 0, 0, 1.98, -303.787, 447.329)`. Manual drag changed translation. Sidebar reentry reset to overview. |
| 1280 × 800 | Focus Map expanded the canvas from 750 × 595 to 1278 × 759. Escape returned to the smaller panel layout at the same zoom. |
| 768 × 900 | Browse opened from the keyboard, focused Close, and returned focus to Browse on Escape. Content stayed within the viewport. |
| 390 × 844 | Browse selected Production Security → CORS and exposed its existing Roadmap session link. Zoom button measured 44 × 44 px. Page content stayed within the viewport. Canvas touch-action was none. |

Five focused Atlas tests and all 32 frontend tests passed. The production build and diff whitespace check passed. No backend suite was run. The live database was not used and no progress was written.

The dense ten-session Production Security branch was inspected at approximately 174% zoom. Compact codes reduce collisions, but two labels (7.2 and 7.3) can still touch at that framing. The inspector and Browse fallback expose the full titles. Physical-device touch and pinch, assistive-technology output, and exhaustive contrast auditing were not performed. Camera moves are immediate and the application retains its existing reduced-motion CSS.

Screenshots: `.local/verification/m312c-dense.jpg` and `.local/verification/m312c-mobile.jpg`.

Suggested commit message: `fix: harden skill atlas navigation and rendering`.
