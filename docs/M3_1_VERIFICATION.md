# M3.1 verification · Interactive Skill Tree

The sidebar now opens /skill-tree alongside the existing Roadmap and Data Safety pages. The map uses three visual branches for the current curriculum, grouping consecutive modules by source order. Lines connect the roadmap hub to each group and show reading order within it. They carry no prerequisite or unlock rules. Tabs, Enter and Space work on native node and list buttons. The graph supports pan, zoom and fit, and the expandable module list remains usable without graph interaction. The selected module panel links directly to existing session and module routes.

## Data and progress

The graph reads GET /api/curriculum through the shared TanStack Query curriculum key. It uses server section IDs and positions and reads the same session-topic percentage as the Roadmap. Module requirements and review counts appear separately. Final competencies stay in the Roadmap. Refresh progress refetches the shared query. Node selection is the only local learning-view state. There are no progress writes, backend changes, or database migrations in this milestone.

## Files and dependency

- Changed frontend/src/App.tsx to add the sidebar entry, breadcrumb and lazy route.
- Added frontend/src/features/skill-tree/SkillTreePage.tsx, tree.ts, skill-tree.css and SkillTreePage.test.tsx.
- Updated frontend/package.json and package-lock.json with @xyflow/react 13.0.3. It provides the graph canvas, viewport and controls. See the [React Flow component reference](https://reactflow.dev/api-reference/react-flow).
- Added this report.

## Verification

| Check | Actual result |
| --- | --- |
| npm.cmd test -- src/features/skill-tree/SkillTreePage.test.tsx | Four passed. Covered source order and stable IDs, fallback selection and session links, separate progress counts and GET-only refresh, and loading, error, retry and empty states. |
| npm.cmd test | All 31 frontend tests passed, including Roadmap and Data Safety regressions. |
| npm.cmd run build | TypeScript and Vite passed. React Flow is loaded through the Skill Tree route chunk. |
| Desktop browser, 1280 px | Real Spring Boot API backed by devquest_test_db displayed 11 nodes and 11 connections. Module 0 showed 92.6% session-topic progress. Drag changed the viewport offset. Zoom in changed the scale from 0.626 to 0.752. Zoom out and Fit View were exercised. Enter selected Module 1 and exposed its eight session links. |
| Mobile viewport, 390 px | Map and fallback fit without horizontal overflow. The list selected Module 10 and opened Session 10.1 on its existing Roadmap route. |
| Data Safety in browser | The page loaded and enabled Markdown export against the same API. |
| Backend suite | Skipped because no backend code changed. Browser verification read the dedicated test database and did not edit progress. |

At narrow widths the fit view prioritizes showing the whole map. Zoom in or use the module list to read individual titles. Mobile verification used browser emulation. Physical-device pinch gestures were not tested.

Suggested commit message: `feat: add interactive curriculum skill tree`.
