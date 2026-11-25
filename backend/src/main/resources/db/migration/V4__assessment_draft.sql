CREATE TABLE devquest.assessment_draft (
    id uuid PRIMARY KEY,
    session_id uuid NOT NULL,
    source_node_id uuid NOT NULL REFERENCES devquest.curriculum_node(id),
    assessment_key varchar(64) NOT NULL,
    release integer NOT NULL CHECK (release > 0),
    position varchar(80) NOT NULL,
    answers jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(answers) = 'array' AND jsonb_array_length(answers) <= 12 AND octet_length(answers::text) <= 32768),
    revealed jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(revealed) = 'array' AND jsonb_array_length(revealed) <= 12),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(session_id, assessment_key)
);
