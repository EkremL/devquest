-- Flyway creates the dedicated devquest schema before applying this migration.
-- M0 establishes infrastructure only: no curriculum, progress, or sample data.
COMMENT ON SCHEMA devquest IS 'DevQuest application schema; managed by Flyway';
