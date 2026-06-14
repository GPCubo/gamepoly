package game

import (
	"math/rand"
	"strings"
	"sync"
	"time"

	"gamepolyweb/backend/internal/config"
)

// BoardConfig holds the tile layout and card decks for one board variant.
// It is loaded once at startup (from DB or hardcoded fallback) and shared
// across all game functions via GameState.Board.
type BoardConfig struct {
	Slug           string
	Locale         string
	DisplayName    string
	GLBPath        string
	Tiles          []config.BoardTile
	ChanceCards    []config.GameCard
	CommunityCards []config.GameCard

	tileIdx map[int]*config.BoardTile // O(1) lookup by tile index
}

// GetTile returns the tile at position index, or nil.
func (b *BoardConfig) GetTile(index int) *config.BoardTile {
	if t, ok := b.tileIdx[index]; ok {
		return t
	}
	return nil
}

// GetGroupTiles returns all tiles matching group and tileType.
func (b *BoardConfig) GetGroupTiles(group string, tileType config.TileType) []config.BoardTile {
	var result []config.BoardTile
	for _, t := range b.Tiles {
		if t.Group == group && t.Type == tileType {
			result = append(result, t)
		}
	}
	return result
}

// GetOwnableTile returns the tile at index if it has a price, else nil.
func (b *BoardConfig) GetOwnableTile(index int) *config.BoardTile {
	t := b.GetTile(index)
	if t == nil || t.Price == nil {
		return nil
	}
	return t
}

// ShuffleDeck returns a Fisher-Yates shuffled slice of 0..size-1.
func (b *BoardConfig) ShuffleDeck(size int) []int {
	deck := make([]int, size)
	for i := range deck {
		deck[i] = i
	}
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	r.Shuffle(size, func(i, j int) { deck[i], deck[j] = deck[j], deck[i] })
	return deck
}

// ResolveCardText replaces {tileName} in card text with the actual tile name.
func (b *BoardConfig) ResolveCardText(card config.GameCard) string {
	if card.TileIndex == nil {
		return card.Text
	}
	tile := b.GetTile(*card.TileIndex)
	if tile == nil {
		return card.Text
	}
	return strings.ReplaceAll(card.Text, "{tileName}", tile.Name)
}

func (b *BoardConfig) buildIdx() {
	b.tileIdx = make(map[int]*config.BoardTile, len(b.Tiles))
	for i := range b.Tiles {
		b.tileIdx[b.Tiles[i].Index] = &b.Tiles[i]
	}
}

// DefaultBoardConfig returns a BoardConfig built from the hardcoded config arrays.
// Used as fallback when DB is unavailable.
func DefaultBoardConfig() *BoardConfig {
	tiles := make([]config.BoardTile, len(config.BoardTiles))
	copy(tiles, config.BoardTiles)
	bc := &BoardConfig{
		Slug:           "monopoly-es",
		Locale:         "es",
		DisplayName:    "Monopoly Clásico",
		GLBPath:        "/models/tablero.glb",
		Tiles:          tiles,
		ChanceCards:    config.ChanceCards,
		CommunityCards: config.CommunityCards,
	}
	bc.buildIdx()
	return bc
}

// ─── BoardRegistry ────────────────────────────────────────────────────────────

// BoardRegistry caches all loaded board configs keyed by slug.
// Safe for concurrent reads after initial load.
type BoardRegistry struct {
	mu       sync.RWMutex
	boards   map[string]*BoardConfig
	defaultB *BoardConfig
}

// NewBoardRegistry creates an empty registry.
func NewBoardRegistry() *BoardRegistry {
	return &BoardRegistry{boards: make(map[string]*BoardConfig)}
}

// Register adds or replaces a board. Cards always use the hardcoded config
// decks (until board_cards DB support is added).
func (r *BoardRegistry) Register(slug, locale, displayName, glbPath string, tiles []config.BoardTile) {
	bc := &BoardConfig{
		Slug:           slug,
		Locale:         locale,
		DisplayName:    displayName,
		GLBPath:        glbPath,
		Tiles:          tiles,
		ChanceCards:    config.ChanceCards,
		CommunityCards: config.CommunityCards,
	}
	bc.buildIdx()
	r.mu.Lock()
	r.boards[slug] = bc
	if r.defaultB == nil {
		r.defaultB = bc
	}
	r.mu.Unlock()
}

// UseHardcoded loads the hardcoded board as the registry's default.
func (r *BoardRegistry) UseHardcoded() {
	bc := DefaultBoardConfig()
	r.mu.Lock()
	r.boards[bc.Slug] = bc
	r.defaultB = bc
	r.mu.Unlock()
}

// Get returns the BoardConfig for slug, falling back to the default if slug
// is empty or not registered. Returns nil only if the registry is empty.
func (r *BoardRegistry) Get(slug string) *BoardConfig {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if slug != "" {
		if bc, ok := r.boards[slug]; ok {
			return bc
		}
	}
	return r.defaultB
}

// IsEmpty reports whether no boards have been loaded yet.
func (r *BoardRegistry) IsEmpty() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.boards) == 0
}
