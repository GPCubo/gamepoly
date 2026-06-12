-- Client-side error events submitted from the frontend
CREATE TABLE IF NOT EXISTS client_error_events (
    id              TEXT        PRIMARY KEY,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    environment     TEXT        NOT NULL DEFAULT 'production',
    release_version TEXT,
    source          TEXT        NOT NULL DEFAULT 'unknown',
    severity        TEXT        NOT NULL DEFAULT 'error',
    message         TEXT        NOT NULL,
    error_name      TEXT,
    stack           TEXT,
    route           TEXT,
    user_agent      TEXT,
    table_id        TEXT,
    player_id_hash  TEXT,
    session_id_hash TEXT,
    event_name      TEXT,
    context         JSONB       NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cee_occurred_at ON client_error_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cee_environment ON client_error_events (environment);
CREATE INDEX IF NOT EXISTS idx_cee_source      ON client_error_events (source);
CREATE INDEX IF NOT EXISTS idx_cee_table_id    ON client_error_events (table_id) WHERE table_id IS NOT NULL;
