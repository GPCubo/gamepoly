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

// hardcodedChanceCards and hardcodedCommunityCards are the fallback card decks
// used when DB has no cards (e.g. before sync:db has been run).
// They mirror config.ChanceCards / config.CommunityCards exactly, but live here
// so boardtiles.go can be slimmed down to types only.
var hardcodedChanceCards = []config.GameCard{
	{ID: "ch01", Group: "chance", Text: "Avanza a {tileName}. Cobra $200.", Action: config.CardMoveTo, TileIndex: cardInt(0)},
	{ID: "ch02", Group: "chance", Text: "Avanza a {tileName}.", Action: config.CardMoveTo, TileIndex: cardInt(11)},
	{ID: "ch03", Group: "chance", Text: "Avanza a {tileName}.", Action: config.CardMoveTo, TileIndex: cardInt(8)},
	{ID: "ch04", Group: "chance", Text: "Avanza a {tileName}.", Action: config.CardMoveTo, TileIndex: cardInt(5)},
	{ID: "ch05", Group: "chance", Text: "Avanza a {tileName}.", Action: config.CardMoveTo, TileIndex: cardInt(25)},
	{ID: "ch06", Group: "chance", Text: "Retrocede 3 casillas.", Action: config.CardMoveSteps, Amount: cardInt(-3)},
	{ID: "ch07", Group: "chance", Text: "Ve a {tileName}. No pases por la Salida.", Action: config.CardGoToJail, TileIndex: cardInt(10)},
	{ID: "ch08", Group: "chance", Text: "Cobra $50 del banco.", Action: config.CardCollect, Amount: cardInt(50)},
	{ID: "ch09", Group: "chance", Text: "Cobra $150 del banco.", Action: config.CardCollect, Amount: cardInt(150)},
	{ID: "ch10", Group: "chance", Text: "Paga $50 de multa.", Action: config.CardPay, Amount: cardInt(50)},
	{ID: "ch11", Group: "chance", Text: "Paga $100 de multa.", Action: config.CardPay, Amount: cardInt(100)},
	{ID: "ch12", Group: "chance", Text: "Paga $25 a cada jugador.", Action: config.CardPayEach, Amount: cardInt(25)},
	{ID: "ch13", Group: "chance", Text: "Tus inversiones te dan frutos. Cobra $100.", Action: config.CardCollect, Amount: cardInt(100)},
	{ID: "ch14", Group: "chance", Text: "Avanza a {tileName}.", Action: config.CardMoveTo, TileIndex: cardInt(24)},
	{ID: "ch15", Group: "chance", Text: "Avanza a {tileName}.", Action: config.CardMoveTo, TileIndex: cardInt(34)},
	{ID: "ch16", Group: "chance", Text: "Banco te paga dividendos: $20.", Action: config.CardCollect, Amount: cardInt(20)},
}

var hardcodedCommunityCards = []config.GameCard{
	{ID: "co01", Group: "community", Text: "Avanza a {tileName}. Cobra $200.", Action: config.CardMoveTo, TileIndex: cardInt(0)},
	{ID: "co02", Group: "community", Text: "Error bancario a tu favor. Cobra $200.", Action: config.CardCollect, Amount: cardInt(200)},
	{ID: "co03", Group: "community", Text: "Gastos medicos. Paga $50.", Action: config.CardPay, Amount: cardInt(50)},
	{ID: "co04", Group: "community", Text: "Gastos del medico. Paga $100.", Action: config.CardPay, Amount: cardInt(100)},
	{ID: "co05", Group: "community", Text: "Paga $50 a cada jugador por una cena de gala.", Action: config.CardPayEach, Amount: cardInt(50)},
	{ID: "co06", Group: "community", Text: "Cobra $45 de intereses de tus inversiones.", Action: config.CardCollect, Amount: cardInt(45)},
	{ID: "co07", Group: "community", Text: "Ve a {tileName}. No pases por la Salida.", Action: config.CardGoToJail, TileIndex: cardInt(10)},
	{ID: "co08", Group: "community", Text: "Herencia: cobra $100.", Action: config.CardCollect, Amount: cardInt(100)},
	{ID: "co09", Group: "community", Text: "Cobra $25 por servicios consultivos.", Action: config.CardCollect, Amount: cardInt(25)},
	{ID: "co10", Group: "community", Text: "Paga $75 por taxes de escuela.", Action: config.CardPay, Amount: cardInt(75)},
	{ID: "co11", Group: "community", Text: "Cobra $10 de dividendos.", Action: config.CardCollect, Amount: cardInt(10)},
	{ID: "co12", Group: "community", Text: "Es tu cumpleanios. Cobra $10 de cada jugador.", Action: config.CardCollect, Amount: cardInt(10)},
	{ID: "co13", Group: "community", Text: "Seguro de vida vence. Cobra $100.", Action: config.CardCollect, Amount: cardInt(100)},
	{ID: "co14", Group: "community", Text: "Paga $50 por hospitalizacion.", Action: config.CardPay, Amount: cardInt(50)},
	{ID: "co15", Group: "community", Text: "Paga $150 por multa de trafico.", Action: config.CardPay, Amount: cardInt(150)},
	{ID: "co16", Group: "community", Text: "Ganaste un concurso de crucigramas. Cobra $100.", Action: config.CardCollect, Amount: cardInt(100)},
}

func cardInt(v int) *int { return &v }

// hardcodedBoardTiles is the canonical Spanish Monopoly board layout.
// Used as fallback when DB is unavailable (mirrors boardtiles.go which is now types-only).
var hardcodedBoardTiles = []config.BoardTile{
	{Index: 0, Type: config.TileTypeCorner, Group: "go", Name: "Salida", Color: "#28b463"},
	{Index: 1, Type: config.TileTypeProperty, Group: "brown", Name: "Ronda de Arrieta", Price: cardInt(60), Color: "#955436"},
	{Index: 2, Type: config.TileTypeCard, Group: "community", Name: "Arca Comunal", Color: "#3aa6e0"},
	{Index: 3, Type: config.TileTypeProperty, Group: "brown", Name: "Plaza de Lavapies", Price: cardInt(60), Color: "#955436"},
	{Index: 4, Type: config.TileTypeTax, Group: "tax", Name: "Impuesto s/Renta", ShortName: "Impuesto", Color: "#5a5a5a"},
	{Index: 5, Type: config.TileTypeRailroad, Group: "railroad", Name: "Estacion Norte", Price: cardInt(200), Color: "#2b2b2b"},
	{Index: 6, Type: config.TileTypeProperty, Group: "lightBlue", Name: "Calle de la Montera", ShortName: "La Montera", Price: cardInt(100), Color: "#aae0fa"},
	{Index: 7, Type: config.TileTypeCard, Group: "chance", Name: "Suerte", Color: "#f7941d"},
	{Index: 8, Type: config.TileTypeProperty, Group: "lightBlue", Name: "Calle de Alcala", Price: cardInt(100), Color: "#aae0fa"},
	{Index: 9, Type: config.TileTypeProperty, Group: "lightBlue", Name: "Gran Via", Price: cardInt(120), Color: "#aae0fa"},
	{Index: 10, Type: config.TileTypeCorner, Group: "jail", Name: "Carcel", ShortName: "Carcel", Color: "#e67e22"},
	{Index: 11, Type: config.TileTypeProperty, Group: "pink", Name: "Paseo del Prado", Price: cardInt(140), Color: "#d93a96"},
	{Index: 12, Type: config.TileTypeUtility, Group: "utility", Name: "Cia. Electrica", ShortName: "Electrica", Price: cardInt(150), Color: "#9ed1a6"},
	{Index: 13, Type: config.TileTypeProperty, Group: "pink", Name: "Calle de Serrano", Price: cardInt(140), Color: "#d93a96"},
	{Index: 14, Type: config.TileTypeProperty, Group: "pink", Name: "Paseo de Recoletos", Price: cardInt(160), Color: "#d93a96"},
	{Index: 15, Type: config.TileTypeRailroad, Group: "railroad", Name: "Estacion Este", Price: cardInt(200), Color: "#2b2b2b"},
	{Index: 16, Type: config.TileTypeProperty, Group: "orange", Name: "Calle de Goya", Price: cardInt(180), Color: "#f7941d"},
	{Index: 17, Type: config.TileTypeCard, Group: "community", Name: "Arca Comunal", Color: "#3aa6e0"},
	{Index: 18, Type: config.TileTypeProperty, Group: "orange", Name: "Calle de Velazquez", Price: cardInt(180), Color: "#f7941d"},
	{Index: 19, Type: config.TileTypeProperty, Group: "orange", Name: "P. de la Castellana", ShortName: "Castellana", Price: cardInt(200), Color: "#f7941d"},
	{Index: 20, Type: config.TileTypeCorner, Group: "parking", Name: "Parking Gratuito", ShortName: "Parking", Color: "#c0392b"},
	{Index: 21, Type: config.TileTypeProperty, Group: "red", Name: "Plaza de Espana", Price: cardInt(220), Color: "#ed1b24"},
	{Index: 22, Type: config.TileTypeCard, Group: "chance", Name: "Suerte", Color: "#f7941d"},
	{Index: 23, Type: config.TileTypeProperty, Group: "red", Name: "Calle de Fuencarral", ShortName: "Fuencarral", Price: cardInt(220), Color: "#ed1b24"},
	{Index: 24, Type: config.TileTypeProperty, Group: "red", Name: "Paseo de la Reforma", ShortName: "Reforma", Price: cardInt(240), Color: "#ed1b24"},
	{Index: 25, Type: config.TileTypeRailroad, Group: "railroad", Name: "Estacion Sur", Price: cardInt(200), Color: "#2b2b2b"},
	{Index: 26, Type: config.TileTypeProperty, Group: "yellow", Name: "Av. de America", ShortName: "America", Price: cardInt(260), Color: "#fef200"},
	{Index: 27, Type: config.TileTypeProperty, Group: "yellow", Name: "Calle Bravo Murillo", ShortName: "Bravo Murillo", Price: cardInt(260), Color: "#fef200"},
	{Index: 28, Type: config.TileTypeUtility, Group: "utility", Name: "Cia. de Agua", ShortName: "Agua", Price: cardInt(150), Color: "#9ed1a6"},
	{Index: 29, Type: config.TileTypeProperty, Group: "yellow", Name: "Calle Alberto Aguilera", ShortName: "Alberto Aguilera", Price: cardInt(280), Color: "#fef200"},
	{Index: 30, Type: config.TileTypeCorner, Group: "gotojail", Name: "Ve a la Carcel", ShortName: "Ve Carcel", Color: "#922b21"},
	{Index: 31, Type: config.TileTypeProperty, Group: "green", Name: "Paseo de Gracia", Price: cardInt(300), Color: "#1fb25a"},
	{Index: 32, Type: config.TileTypeProperty, Group: "green", Name: "Rambla de Cataluna", Price: cardInt(300), Color: "#1fb25a"},
	{Index: 33, Type: config.TileTypeCard, Group: "community", Name: "Arca Comunal", Color: "#3aa6e0"},
	{Index: 34, Type: config.TileTypeProperty, Group: "green", Name: "Avenida Diagonal", Price: cardInt(320), Color: "#1fb25a"},
	{Index: 35, Type: config.TileTypeRailroad, Group: "railroad", Name: "Estacion Oeste", Price: cardInt(200), Color: "#2b2b2b"},
	{Index: 36, Type: config.TileTypeCard, Group: "chance", Name: "Suerte", Color: "#f7941d"},
	{Index: 37, Type: config.TileTypeProperty, Group: "darkBlue", Name: "Paseo de la Habana", ShortName: "La Habana", Price: cardInt(350), Color: "#0072bb"},
	{Index: 38, Type: config.TileTypeTax, Group: "tax", Name: "Impuesto de Lujo", ShortName: "Lujo", Color: "#5a5a5a"},
	{Index: 39, Type: config.TileTypeProperty, Group: "darkBlue", Name: "Paseo del Arte", Price: cardInt(400), Color: "#0072bb"},
}

// DefaultBoardConfig returns a BoardConfig built from the hardcoded data.
// Used when DB is unavailable (dev without DB, or server startup before sync:db).
func DefaultBoardConfig() *BoardConfig {
	tiles := make([]config.BoardTile, len(hardcodedBoardTiles))
	copy(tiles, hardcodedBoardTiles)
	bc := &BoardConfig{
		Slug:           "monopoly-es",
		Locale:         "es",
		DisplayName:    "Monopoly Clásico",
		GLBPath:        "/models/tablero.glb",
		Tiles:          tiles,
		ChanceCards:    hardcodedChanceCards,
		CommunityCards: hardcodedCommunityCards,
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

// Register adds or replaces a board. chanceCards and communityCards come from DB;
// if either is empty (e.g. sync:db not yet run), the hardcoded fallback is used.
func (r *BoardRegistry) Register(slug, locale, displayName, glbPath string,
	tiles []config.BoardTile,
	chanceCards, communityCards []config.GameCard,
) {
	if len(chanceCards) == 0 {
		chanceCards = hardcodedChanceCards
	}
	if len(communityCards) == 0 {
		communityCards = hardcodedCommunityCards
	}
	bc := &BoardConfig{
		Slug:           slug,
		Locale:         locale,
		DisplayName:    displayName,
		GLBPath:        glbPath,
		Tiles:          tiles,
		ChanceCards:    chanceCards,
		CommunityCards: communityCards,
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
