-- DataInsight Toolbox - initial relational schema.
-- Portable SQL: no Supabase specific extensions are required beyond pgcrypto
-- for gen_random_uuid(). On PostgreSQL 13+ pgcrypto is available by default.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         text        NOT NULL UNIQUE,
    display_name  text,
    avatar_url    text,
    role          text        NOT NULL DEFAULT 'user',
    created_at    timestamptz NOT NULL DEFAULT now(),
    last_login_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Templates and their immutable versions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS templates (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name            text        NOT NULL,
    description     text        NOT NULL DEFAULT '',
    category        text        NOT NULL DEFAULT 'general',
    status          text        NOT NULL DEFAULT 'active',
    current_version integer     NOT NULL DEFAULT 1,
    usage_count     integer     NOT NULL DEFAULT 0,
    last_used_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS templates_owner_idx ON templates (owner_id, status);

CREATE TABLE IF NOT EXISTS template_versions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id    uuid        NOT NULL REFERENCES templates (id) ON DELETE CASCADE,
    version        integer     NOT NULL,
    definition     jsonb       NOT NULL,
    sample_dataset jsonb,
    change_note    text        NOT NULL DEFAULT '',
    created_by     uuid        NOT NULL REFERENCES users (id),
    created_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (template_id, version)
);

-- ---------------------------------------------------------------------------
-- Datasets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datasets (
    id           uuid PRIMARY KEY,
    owner_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    source_type  text        NOT NULL,
    source_name  text        NOT NULL,
    row_count    integer     NOT NULL DEFAULT 0,
    column_count integer     NOT NULL DEFAULT 0,
    sample_rows  jsonb       NOT NULL DEFAULT '[]'::jsonb,
    metadata     jsonb       NOT NULL DEFAULT '{}'::jsonb,
    expires_at   timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dataset_columns (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id      uuid    NOT NULL REFERENCES datasets (id) ON DELETE CASCADE,
    column_index    integer NOT NULL,
    name            text    NOT NULL,
    normalized_name text    NOT NULL,
    column_key      text    NOT NULL,
    inferred_type   text    NOT NULL,
    nullable        boolean NOT NULL DEFAULT true,
    null_count      integer NOT NULL DEFAULT 0,
    distinct_count  integer NOT NULL DEFAULT 0,
    numeric_ratio   real    NOT NULL DEFAULT 0,
    sample_values   jsonb   NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS dataset_columns_dataset_idx ON dataset_columns (dataset_id);

CREATE TABLE IF NOT EXISTS dataset_issues (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id uuid NOT NULL REFERENCES datasets (id) ON DELETE CASCADE,
    code       text NOT NULL,
    severity   text NOT NULL,
    message    text NOT NULL,
    details    jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS dataset_issues_dataset_idx ON dataset_issues (dataset_id);

-- ---------------------------------------------------------------------------
-- Analysis requests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analysis_requests (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id            uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title               text        NOT NULL,
    status              text        NOT NULL,
    source_type         text        NOT NULL,
    source_name         text        NOT NULL DEFAULT '',
    template_id         uuid        REFERENCES templates (id) ON DELETE SET NULL,
    template_version_id uuid        REFERENCES template_versions (id) ON DELETE SET NULL,
    dataset_id          uuid        REFERENCES datasets (id) ON DELETE SET NULL,
    sheets              jsonb       NOT NULL DEFAULT '[]'::jsonb,
    definition          jsonb,
    match_result        jsonb,
    resolution          jsonb,
    error               jsonb,
    engine_version      text        NOT NULL DEFAULT '',
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    completed_at        timestamptz
);
CREATE INDEX IF NOT EXISTS analysis_requests_owner_idx
    ON analysis_requests (owner_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Analysis output
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analysis_results (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_request_id uuid        NOT NULL UNIQUE
                                    REFERENCES analysis_requests (id) ON DELETE CASCADE,
    metrics             jsonb       NOT NULL DEFAULT '[]'::jsonb,
    statistics          jsonb       NOT NULL DEFAULT '[]'::jsonb,
    group_summary       jsonb       NOT NULL DEFAULT '[]'::jsonb,
    rankings            jsonb       NOT NULL DEFAULT '[]'::jsonb,
    outliers            jsonb       NOT NULL DEFAULT '[]'::jsonb,
    trends              jsonb       NOT NULL DEFAULT '[]'::jsonb,
    warnings            jsonb       NOT NULL DEFAULT '[]'::jsonb,
    timings             jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS charts (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_request_id uuid        NOT NULL REFERENCES analysis_requests (id) ON DELETE CASCADE,
    chart_key           text        NOT NULL,
    type                text        NOT NULL,
    title               text        NOT NULL,
    config              jsonb       NOT NULL DEFAULT '{}'::jsonb,
    storage_key         text        NOT NULL,
    content_type        text        NOT NULL DEFAULT 'image/png',
    created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS charts_request_idx ON charts (analysis_request_id);

CREATE TABLE IF NOT EXISTS ai_analyses (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_request_id uuid        NOT NULL UNIQUE
                                    REFERENCES analysis_requests (id) ON DELETE CASCADE,
    provider            text        NOT NULL,
    model               text        NOT NULL DEFAULT '',
    status              text        NOT NULL,
    sections            jsonb       NOT NULL DEFAULT '{}'::jsonb,
    unverified_numbers  jsonb       NOT NULL DEFAULT '[]'::jsonb,
    error               jsonb,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_request_id uuid        NOT NULL REFERENCES analysis_requests (id) ON DELETE CASCADE,
    owner_id            uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title               text        NOT NULL,
    storage_key         text        NOT NULL,
    content_type        text        NOT NULL DEFAULT 'application/pdf',
    size_bytes          integer     NOT NULL DEFAULT 0,
    template_id         uuid        REFERENCES templates (id) ON DELETE SET NULL,
    template_version_id uuid        REFERENCES template_versions (id) ON DELETE RESTRICT,
    report_version      text        NOT NULL DEFAULT '1',
    generated_at        timestamptz NOT NULL DEFAULT now(),
    retention_expires_at timestamptz
);
CREATE INDEX IF NOT EXISTS reports_owner_idx ON reports (owner_id, generated_at DESC);

-- ---------------------------------------------------------------------------
-- Jobs and audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_request_id uuid        NOT NULL REFERENCES analysis_requests (id) ON DELETE CASCADE,
    type                text        NOT NULL,
    status              text        NOT NULL,
    attempts            integer     NOT NULL DEFAULT 0,
    max_attempts        integer     NOT NULL DEFAULT 1,
    payload             jsonb       NOT NULL DEFAULT '{}'::jsonb,
    error               jsonb,
    scheduled_at        timestamptz NOT NULL DEFAULT now(),
    started_at          timestamptz,
    finished_at         timestamptz
);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs (status, scheduled_at);

CREATE TABLE IF NOT EXISTS audit_logs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    uuid        REFERENCES users (id) ON DELETE SET NULL,
    action      text        NOT NULL,
    entity_type text        NOT NULL,
    entity_id   text,
    metadata    jsonb       NOT NULL DEFAULT '{}'::jsonb,
    ip_hash     text,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs (actor_id, created_at DESC);
