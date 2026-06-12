-- Finished games: one row per completed or abandoned table
CREATE TABLE IF NOT EXISTS finished_games (
    table_id         VARCHAR(32)  PRIMARY KEY,
    winner_player_id VARCHAR(32),
    finish_reason    VARCHAR(32)  NOT NULL, -- 'game_over' | 'all_humans_left' | 'inactivity_timeout'
    started_at       TIMESTAMPTZ  NOT NULL,
    finished_at      TIMESTAMPTZ  NOT NULL,
    turn_count       INT          NOT NULL DEFAULT 0,
    player_count     INT          NOT NULL DEFAULT 0,
    final_state      JSONB,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Final state of each player in the game
CREATE TABLE IF NOT EXISTS finished_game_players (
    id             BIGSERIAL    PRIMARY KEY,
    table_id       VARCHAR(32)  NOT NULL REFERENCES finished_games(table_id) ON DELETE CASCADE,
    player_id      VARCHAR(32)  NOT NULL,
    player_name    VARCHAR(64)  NOT NULL,
    is_bot         BOOLEAN      NOT NULL DEFAULT FALSE,
    bot_difficulty VARCHAR(16),
    final_cash     INT          NOT NULL DEFAULT 0,
    final_position INT          NOT NULL DEFAULT 0,
    is_bankrupt    BOOLEAN      NOT NULL DEFAULT FALSE,
    is_winner      BOOLEAN      NOT NULL DEFAULT FALSE,
    property_count INT          NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_fgp_table ON finished_game_players(table_id);

-- Economic events (rent, tax, purchase, card, build, etc.)
CREATE TABLE IF NOT EXISTS finished_game_economic_events (
    id          BIGSERIAL    PRIMARY KEY,
    table_id    VARCHAR(32)  NOT NULL REFERENCES finished_games(table_id) ON DELETE CASCADE,
    event_seq   INT          NOT NULL,
    event_type  VARCHAR(32)  NOT NULL,
    title       VARCHAR(256) NOT NULL,
    detail      TEXT,
    amount      INT,
    player_ids  TEXT[]       NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_fgee_table ON finished_game_economic_events(table_id);

-- Dice rolls and movements between tiles
CREATE TABLE IF NOT EXISTS finished_game_movements (
    id          BIGSERIAL    PRIMARY KEY,
    table_id    VARCHAR(32)  NOT NULL REFERENCES finished_games(table_id) ON DELETE CASCADE,
    event_seq   INT          NOT NULL,
    player_id   VARCHAR(32)  NOT NULL,
    player_name VARCHAR(64)  NOT NULL,
    source      VARCHAR(16)  NOT NULL, -- 'dice' | 'card'
    dice_v1     INT          NOT NULL DEFAULT 0,
    dice_v2     INT          NOT NULL DEFAULT 0,
    dice_total  INT          NOT NULL DEFAULT 0,
    from_pos    INT          NOT NULL,
    to_pos      INT          NOT NULL,
    card_id     VARCHAR(64),
    card_text   TEXT
);

CREATE INDEX IF NOT EXISTS idx_fgm_table ON finished_game_movements(table_id);

-- Chance / Community Chest cards drawn
CREATE TABLE IF NOT EXISTS finished_game_cards (
    id          BIGSERIAL    PRIMARY KEY,
    table_id    VARCHAR(32)  NOT NULL REFERENCES finished_games(table_id) ON DELETE CASCADE,
    event_seq   INT          NOT NULL,
    player_id   VARCHAR(32)  NOT NULL,
    player_name VARCHAR(64)  NOT NULL,
    card_id     VARCHAR(64)  NOT NULL,
    card_group  VARCHAR(16)  NOT NULL, -- 'chance' | 'community'
    card_text   TEXT         NOT NULL,
    card_action VARCHAR(32)  NOT NULL,
    card_amount INT,
    card_tile   INT,
    effect      TEXT
);

CREATE INDEX IF NOT EXISTS idx_fgc_table ON finished_game_cards(table_id);
