CREATE TABLE devquest.curriculum (
    id uuid PRIMARY KEY,
    source_key text NOT NULL UNIQUE,
    title text NOT NULL,
    imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE devquest.curriculum_revision (
    id uuid PRIMARY KEY,
    curriculum_id uuid NOT NULL UNIQUE REFERENCES devquest.curriculum(id),
    sha256 varchar(64) NOT NULL,
    source_markdown text NOT NULL,
    imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE devquest.curriculum_node (
    id uuid PRIMARY KEY,
    revision_id uuid NOT NULL REFERENCES devquest.curriculum_revision(id),
    parent_id uuid REFERENCES devquest.curriculum_node(id),
    kind varchar(24) NOT NULL CHECK (kind IN ('ROOT','MODULE','SESSION','MODULE_COMPLETION','FINAL_COMPETENCIES')),
    title text NOT NULL,
    position integer NOT NULL CHECK (position >= 0),
    source_line integer NOT NULL CHECK (source_line > 0),
    UNIQUE(revision_id, position)
);
CREATE INDEX curriculum_node_parent_idx ON devquest.curriculum_node(parent_id);
CREATE TABLE devquest.checklist_item (
    id uuid PRIMARY KEY,
    node_id uuid NOT NULL REFERENCES devquest.curriculum_node(id),
    label text NOT NULL,
    position integer NOT NULL CHECK (position >= 0),
    initially_completed boolean NOT NULL,
    UNIQUE(node_id, position)
);
CREATE TABLE devquest.source_item_mapping (
    item_id uuid PRIMARY KEY REFERENCES devquest.checklist_item(id),
    revision_id uuid NOT NULL REFERENCES devquest.curriculum_revision(id),
    occurrence integer NOT NULL CHECK (occurrence >= 0),
    source_line integer NOT NULL CHECK (source_line > 0),
    UNIQUE(revision_id, occurrence)
);
CREATE TABLE devquest.item_progress (
    item_id uuid PRIMARY KEY REFERENCES devquest.checklist_item(id),
    status varchar(20) NOT NULL CHECK (status IN ('NOT_STARTED','IN_PROGRESS','NEEDS_REVIEW','COMPLETED')),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    CHECK (completed_at IS NULL OR status = 'COMPLETED')
);
CREATE TABLE devquest.progress_event (
    id uuid PRIMARY KEY,
    item_id uuid NOT NULL REFERENCES devquest.item_progress(item_id),
    from_status varchar(20) NOT NULL CHECK (from_status IN ('NOT_STARTED','IN_PROGRESS','NEEDS_REVIEW','COMPLETED')),
    to_status varchar(20) NOT NULL CHECK (to_status IN ('NOT_STARTED','IN_PROGRESS','NEEDS_REVIEW','COMPLETED')),
    progress_version bigint NOT NULL CHECK (progress_version > 0),
    occurred_at timestamptz NOT NULL,
    CHECK (from_status <> to_status),
    UNIQUE(item_id, progress_version)
);
CREATE INDEX progress_event_time_idx ON devquest.progress_event(occurred_at);
