-- The originating draft UUID is the permanent submission identity.
CREATE TABLE devquest.assessment_attempt (
    id uuid PRIMARY KEY,
    draft_version bigint NOT NULL CHECK (draft_version >= 0),
    session_id uuid NOT NULL,
    source_node_id uuid NOT NULL REFERENCES devquest.curriculum_node(id),
    assessment_key varchar(64) NOT NULL,
    release integer NOT NULL CHECK (release > 0),
    started_at timestamptz NOT NULL,
    submitted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    independent_correct smallint NOT NULL CHECK (independent_correct >= 0),
    independent_incorrect smallint NOT NULL CHECK (independent_incorrect >= 0),
    guided smallint NOT NULL CHECK (guided >= 0),
    skipped smallint NOT NULL CHECK (skipped >= 0),
    written boolean NOT NULL,
    rating varchar(32) CHECK (written AND rating IN ('Meets criteria','Partially meets criteria','Needs review') OR rating IS NULL),
    -- json preserves authored option order for historical display.
    snapshot json NOT NULL CHECK (json_typeof(snapshot) = 'object' AND octet_length(snapshot::text) <= 262144)
);
CREATE INDEX assessment_attempt_history ON devquest.assessment_attempt
    (session_id,assessment_key,submitted_at DESC,id DESC);

CREATE FUNCTION devquest.reject_attempt_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Submitted assessment attempts are immutable';
END;
$$;
CREATE TRIGGER assessment_attempt_immutable BEFORE UPDATE OR DELETE ON devquest.assessment_attempt
    FOR EACH ROW EXECUTE FUNCTION devquest.reject_attempt_change();
