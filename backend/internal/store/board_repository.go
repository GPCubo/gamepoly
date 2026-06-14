package store

import (
	"context"
	"fmt"
)

// Board represents a playable board variant.
type Board struct {
	ID          int64
	Slug        string
	Locale      string
	DisplayName string
	GLBPath     string
	Visible     bool
}

// BoardTile represents a single tile within a board.
type BoardTile struct {
	ID        int64
	BoardID   int64
	TileIndex int
	TileType  string
	TileGroup string
	Name      string
	ShortName string
	Price     *int
	ColorHex  *string
}

// BoardCard represents one card within a board's chance or community deck.
type BoardCard struct {
	ID        int64
	BoardID   int64
	CardGroup string
	CardIndex int
	CardID    string
	Text      string
	Action    string
	Amount    *int
	TileIndex *int
}

// Token represents a selectable player piece.
type Token struct {
	ID        int64
	Slug      string
	GLBPath   string
	LabelKey  string
	Visible   bool
	SortOrder int
}

// BoardRepository reads board, tile, and token records from PostgreSQL.
type BoardRepository struct {
	pg *PostgresStore
}

// NewBoardRepository wraps a PostgresStore.
// Returns nil when pg is nil (Postgres disabled).
func NewBoardRepository(pg *PostgresStore) *BoardRepository {
	if pg == nil {
		return nil
	}
	return &BoardRepository{pg: pg}
}

// GetVisibleBoards returns all boards with visible=true for the given locale.
func (r *BoardRepository) GetVisibleBoards(ctx context.Context, locale string) ([]Board, error) {
	if r == nil {
		return nil, nil
	}

	rows, err := r.pg.Pool.Query(ctx, `
		SELECT id, slug, locale, display_name, glb_path, visible
		FROM boards
		WHERE visible = TRUE AND locale = $1
		ORDER BY created_at
	`, locale)
	if err != nil {
		return nil, fmt.Errorf("query boards: %w", err)
	}
	defer rows.Close()

	var boards []Board
	for rows.Next() {
		var b Board
		if err := rows.Scan(&b.ID, &b.Slug, &b.Locale, &b.DisplayName, &b.GLBPath, &b.Visible); err != nil {
			return nil, fmt.Errorf("scan board: %w", err)
		}
		boards = append(boards, b)
	}
	return boards, rows.Err()
}

// GetAllVisibleBoards returns all boards with visible=true across all locales.
func (r *BoardRepository) GetAllVisibleBoards(ctx context.Context) ([]Board, error) {
	if r == nil {
		return nil, nil
	}

	rows, err := r.pg.Pool.Query(ctx, `
		SELECT id, slug, locale, display_name, glb_path, visible
		FROM boards
		WHERE visible = TRUE
		ORDER BY locale, created_at
	`)
	if err != nil {
		return nil, fmt.Errorf("query boards: %w", err)
	}
	defer rows.Close()

	var boards []Board
	for rows.Next() {
		var b Board
		if err := rows.Scan(&b.ID, &b.Slug, &b.Locale, &b.DisplayName, &b.GLBPath, &b.Visible); err != nil {
			return nil, fmt.Errorf("scan board: %w", err)
		}
		boards = append(boards, b)
	}
	return boards, rows.Err()
}

// GetBoardBySlug returns a single board by its slug.
func (r *BoardRepository) GetBoardBySlug(ctx context.Context, slug string) (*Board, error) {
	if r == nil {
		return nil, nil
	}

	var b Board
	err := r.pg.Pool.QueryRow(ctx, `
		SELECT id, slug, locale, display_name, glb_path, visible
		FROM boards WHERE slug = $1
	`, slug).Scan(&b.ID, &b.Slug, &b.Locale, &b.DisplayName, &b.GLBPath, &b.Visible)
	if err != nil {
		return nil, fmt.Errorf("query board by slug %q: %w", slug, err)
	}
	return &b, nil
}

// GetBoardTiles returns the 40 tiles for the given boardID, ordered by tile_index.
func (r *BoardRepository) GetBoardTiles(ctx context.Context, boardID int64) ([]BoardTile, error) {
	if r == nil {
		return nil, nil
	}

	rows, err := r.pg.Pool.Query(ctx, `
		SELECT id, board_id, tile_index, tile_type, tile_group, name, short_name, price, color_hex
		FROM board_tiles
		WHERE board_id = $1
		ORDER BY tile_index
	`, boardID)
	if err != nil {
		return nil, fmt.Errorf("query board_tiles: %w", err)
	}
	defer rows.Close()

	var tiles []BoardTile
	for rows.Next() {
		var t BoardTile
		if err := rows.Scan(
			&t.ID, &t.BoardID, &t.TileIndex, &t.TileType, &t.TileGroup,
			&t.Name, &t.ShortName, &t.Price, &t.ColorHex,
		); err != nil {
			return nil, fmt.Errorf("scan board_tile: %w", err)
		}
		tiles = append(tiles, t)
	}
	return tiles, rows.Err()
}

// GetVisibleTokens returns all tokens with visible=true, ordered by sort_order.
func (r *BoardRepository) GetVisibleTokens(ctx context.Context) ([]Token, error) {
	if r == nil {
		return nil, nil
	}

	rows, err := r.pg.Pool.Query(ctx, `
		SELECT id, slug, glb_path, label_key, visible, sort_order
		FROM tokens
		WHERE visible = TRUE
		ORDER BY sort_order
	`)
	if err != nil {
		return nil, fmt.Errorf("query tokens: %w", err)
	}
	defer rows.Close()

	var tokens []Token
	for rows.Next() {
		var t Token
		if err := rows.Scan(&t.ID, &t.Slug, &t.GLBPath, &t.LabelKey, &t.Visible, &t.SortOrder); err != nil {
			return nil, fmt.Errorf("scan token: %w", err)
		}
		tokens = append(tokens, t)
	}
	return tokens, rows.Err()
}

// GetBoardCards returns all cards for the given boardID ordered by group then card_index.
func (r *BoardRepository) GetBoardCards(ctx context.Context, boardID int64) ([]BoardCard, error) {
	if r == nil {
		return nil, nil
	}

	rows, err := r.pg.Pool.Query(ctx, `
		SELECT id, board_id, card_group, card_index, card_id, text, action, amount, tile_index
		FROM board_cards
		WHERE board_id = $1
		ORDER BY card_group, card_index
	`, boardID)
	if err != nil {
		return nil, fmt.Errorf("query board_cards: %w", err)
	}
	defer rows.Close()

	var cards []BoardCard
	for rows.Next() {
		var c BoardCard
		if err := rows.Scan(
			&c.ID, &c.BoardID, &c.CardGroup, &c.CardIndex, &c.CardID,
			&c.Text, &c.Action, &c.Amount, &c.TileIndex,
		); err != nil {
			return nil, fmt.Errorf("scan board_card: %w", err)
		}
		cards = append(cards, c)
	}
	return cards, rows.Err()
}
