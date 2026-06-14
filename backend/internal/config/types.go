package config

// TileType categorizes each board position.
type TileType string

const (
	TileTypeCorner   TileType = "corner"
	TileTypeProperty TileType = "property"
	TileTypeCard     TileType = "card"
	TileTypeTax      TileType = "tax"
	TileTypeRailroad TileType = "railroad"
	TileTypeUtility  TileType = "utility"
)

// CardActionType is the engine action a drawn card triggers.
type CardActionType string

const (
	CardMoveTo    CardActionType = "moveTo"
	CardMoveSteps CardActionType = "moveSteps"
	CardCollect   CardActionType = "collect"
	CardPay       CardActionType = "pay"
	CardPayEach   CardActionType = "payEach"
	CardGoToJail  CardActionType = "goToJail"
)

// GameCard represents a single Chance or Community Chest card.
type GameCard struct {
	ID        string         `json:"id"`
	Group     string         `json:"group"` // "chance" | "community"
	Text      string         `json:"text"`
	Action    CardActionType `json:"action"`
	Amount    *int           `json:"amount,omitempty"`
	TileIndex *int           `json:"tileIndex,omitempty"`
}

// BoardTile represents a single position on the board.
type BoardTile struct {
	Index     int      `json:"index"`
	Type      TileType `json:"type"`
	Group     string   `json:"group"`
	Name      string   `json:"name"`
	ShortName string   `json:"shortName,omitempty"`
	Price     *int     `json:"price,omitempty"`
	Color     string   `json:"color,omitempty"`
}
