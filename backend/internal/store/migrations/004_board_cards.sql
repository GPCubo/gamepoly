-- Cards that belong to a board (Chance and Community Chest)
CREATE TABLE IF NOT EXISTS board_cards (
    id          BIGSERIAL    PRIMARY KEY,
    board_id    BIGINT       NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    card_group  TEXT         NOT NULL,   -- 'chance' | 'community'
    card_index  INT          NOT NULL,   -- 0-based position within the group deck
    card_id     TEXT         NOT NULL,   -- 'ch01', 'co07', etc.
    text        TEXT         NOT NULL,   -- may contain {tileName} placeholder
    action      TEXT         NOT NULL,   -- 'moveTo'|'moveSteps'|'collect'|'pay'|'payEach'|'goToJail'
    amount      INT,                     -- nullable — cash amount involved
    tile_index  INT,                     -- nullable — board tile index (0-39) for move actions
    CONSTRAINT uq_board_card UNIQUE (board_id, card_group, card_index)
);

CREATE INDEX IF NOT EXISTS idx_bc_board ON board_cards(board_id);
