package store

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"gamepolyweb/backend/internal/game"
)

// FinishedGameRepository persists completed game records to PostgreSQL.
type FinishedGameRepository struct {
	pg *PostgresStore
}

// NewFinishedGameRepository wraps a PostgresStore for game persistence.
// Returns nil when pg is nil (Postgres disabled).
func NewFinishedGameRepository(pg *PostgresStore) *FinishedGameRepository {
	if pg == nil {
		return nil
	}
	return &FinishedGameRepository{pg: pg}
}

// SaveFinishedGame writes the complete game snapshot and all history tables
// inside a single transaction. The insert into finished_games uses
// ON CONFLICT DO NOTHING so the operation is idempotent per table_id.
func (r *FinishedGameRepository) SaveFinishedGame(
	ctx context.Context,
	tableID string,
	gs *game.GameState,
	reason string,
	startedAt time.Time,
) error {
	if r == nil {
		return nil
	}

	finishedAt := time.Now()

	finalStateJSON, err := json.Marshal(gs)
	if err != nil {
		return fmt.Errorf("marshal GameState: %w", err)
	}

	var winnerID *string
	if w := gs.Winner(); w != nil {
		winnerID = &w.ID
	}

	turnCount := len(gs.MovementHistory)

	tx, err := r.pg.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		INSERT INTO finished_games
			(table_id, winner_player_id, finish_reason, started_at, finished_at, turn_count, player_count, final_state)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		ON CONFLICT (table_id) DO NOTHING
	`, tableID, winnerID, reason, startedAt, finishedAt, turnCount, len(gs.Players), finalStateJSON)
	if err != nil {
		return fmt.Errorf("insert finished_games: %w", err)
	}

	if tag.RowsAffected() == 0 {
		// Already persisted for this table_id — skip child inserts.
		log.Printf("[postgres] game %s already persisted, skipping", tableID)
		return tx.Commit(ctx)
	}

	// Players
	for _, p := range gs.Players {
		isBankrupt := gs.IsBankrupt(p.ID)
		isWinner := winnerID != nil && *winnerID == p.ID
		propCount := 0
		for _, ownerID := range gs.PropertyOwners {
			if ownerID == p.ID {
				propCount++
			}
		}
		var diff *string
		if p.BotDifficulty != "" {
			d := string(p.BotDifficulty)
			diff = &d
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO finished_game_players
				(table_id, player_id, player_name, is_bot, bot_difficulty,
				 final_cash, final_position, is_bankrupt, is_winner, property_count)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		`, tableID, p.ID, p.Name, p.IsBot, diff,
			p.Cash, p.Position, isBankrupt, isWinner, propCount,
		); err != nil {
			return fmt.Errorf("insert player %s: %w", p.ID, err)
		}
	}

	// Economic history
	for i, ev := range gs.EconomicHistory {
		pids := ev.PlayerIDs
		if pids == nil {
			pids = []string{}
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO finished_game_economic_events
				(table_id, event_seq, event_type, title, detail, amount, player_ids)
			VALUES ($1,$2,$3,$4,$5,$6,$7)
		`, tableID, i, string(ev.Type), ev.Title, ev.Detail, ev.Amount, pids,
		); err != nil {
			return fmt.Errorf("insert economic event %d: %w", i, err)
		}
	}

	// Movement history
	for i, mv := range gs.MovementHistory {
		cardID := nilStr(mv.CardID)
		cardText := nilStr(mv.CardText)
		if _, err := tx.Exec(ctx, `
			INSERT INTO finished_game_movements
				(table_id, event_seq, player_id, player_name,
				 source, dice_v1, dice_v2, dice_total, from_pos, to_pos, card_id, card_text)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		`, tableID, i, mv.PlayerID, mv.PlayerName,
			mv.Source, mv.DiceValues[0], mv.DiceValues[1], mv.DiceTotal,
			mv.From, mv.To, cardID, cardText,
		); err != nil {
			return fmt.Errorf("insert movement %d: %w", i, err)
		}
	}

	// Card history
	for i, c := range gs.CardHistory {
		if _, err := tx.Exec(ctx, `
			INSERT INTO finished_game_cards
				(table_id, event_seq, player_id, player_name,
				 card_id, card_group, card_text, card_action, card_amount, card_tile, effect)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		`, tableID, i, c.PlayerID, c.PlayerName,
			c.CardID, c.Group, c.Text, string(c.Action),
			c.Amount, c.TileIndex, c.Effect,
		); err != nil {
			return fmt.Errorf("insert card %d: %w", i, err)
		}
	}

	return tx.Commit(ctx)
}

func nilStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
