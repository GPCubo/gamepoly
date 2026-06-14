-- Board definitions: one row per distinct board variant
CREATE TABLE IF NOT EXISTS boards (
    id           BIGSERIAL    PRIMARY KEY,
    slug         TEXT         NOT NULL UNIQUE,    -- e.g. 'monopoly-es'
    locale       TEXT         NOT NULL,           -- 'es', 'en', ...
    display_name TEXT         NOT NULL,
    glb_path     TEXT         NOT NULL,           -- relative to public/, e.g. '/models/tablero.glb'
    visible      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- The 40 tiles that make up a board
CREATE TABLE IF NOT EXISTS board_tiles (
    id           BIGSERIAL    PRIMARY KEY,
    board_id     BIGINT       NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    tile_index   INT          NOT NULL,           -- 0-39
    tile_type    TEXT         NOT NULL,           -- 'corner'|'property'|'railroad'|'utility'|'tax'|'card'
    tile_group   TEXT         NOT NULL,
    name         TEXT         NOT NULL,
    short_name   TEXT         NOT NULL DEFAULT '',
    price        INT,
    color_hex    TEXT,
    CONSTRAINT uq_board_tile UNIQUE (board_id, tile_index)
);

CREATE INDEX IF NOT EXISTS idx_bt_board ON board_tiles(board_id);

-- Player tokens/pieces available in the game
CREATE TABLE IF NOT EXISTS tokens (
    id           BIGSERIAL    PRIMARY KEY,
    slug         TEXT         NOT NULL UNIQUE,    -- e.g. 'sombrero'
    glb_path     TEXT         NOT NULL,           -- relative to public/
    label_key    TEXT         NOT NULL DEFAULT '', -- i18n key
    visible      BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order   INT          NOT NULL DEFAULT 0
);
