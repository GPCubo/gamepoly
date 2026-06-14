package config

type TileType string

const (
	TileTypeCorner   TileType = "corner"
	TileTypeProperty TileType = "property"
	TileTypeCard     TileType = "card"
	TileTypeTax      TileType = "tax"
	TileTypeRailroad TileType = "railroad"
	TileTypeUtility  TileType = "utility"
)

type CardActionType string

const (
	CardMoveTo   CardActionType = "moveTo"
	CardMoveSteps CardActionType = "moveSteps"
	CardCollect  CardActionType = "collect"
	CardPay      CardActionType = "pay"
	CardPayEach  CardActionType = "payEach"
	CardGoToJail CardActionType = "goToJail"
)

type GameCard struct {
	ID        string         `json:"id"`
	Group     string         `json:"group"` // "chance" | "community"
	Text      string         `json:"text"`
	Action    CardActionType `json:"action"`
	Amount    *int           `json:"amount,omitempty"`
	TileIndex *int           `json:"tileIndex,omitempty"`
}

type BoardTile struct {
	Index     int      `json:"index"`
	Type      TileType `json:"type"`
	Group     string   `json:"group"`
	Name      string   `json:"name"`
	ShortName string   `json:"shortName,omitempty"`
	Price     *int     `json:"price,omitempty"`
	Color     string   `json:"color,omitempty"`
}

func intPtr(v int) *int { return &v }

var BoardTiles = []BoardTile{
	{Index: 0, Type: TileTypeCorner, Group: "go", Name: "Salida", Color: "#28b463"},
	{Index: 1, Type: TileTypeProperty, Group: "brown", Name: "Ronda de Arrieta", Price: intPtr(60), Color: "#955436"},
	{Index: 2, Type: TileTypeCard, Group: "community", Name: "Arca Comunal", Color: "#3aa6e0"},
	{Index: 3, Type: TileTypeProperty, Group: "brown", Name: "Plaza de Lavapies", Price: intPtr(60), Color: "#955436"},
	{Index: 4, Type: TileTypeTax, Group: "tax", Name: "Impuesto s/Renta", ShortName: "Impuesto", Color: "#5a5a5a"},
	{Index: 5, Type: TileTypeRailroad, Group: "railroad", Name: "Estacion Norte", Price: intPtr(200), Color: "#2b2b2b"},
	{Index: 6, Type: TileTypeProperty, Group: "lightBlue", Name: "Calle de la Montera", ShortName: "La Montera", Price: intPtr(100), Color: "#aae0fa"},
	{Index: 7, Type: TileTypeCard, Group: "chance", Name: "Suerte", Color: "#f7941d"},
	{Index: 8, Type: TileTypeProperty, Group: "lightBlue", Name: "Calle de Alcala", Price: intPtr(100), Color: "#aae0fa"},
	{Index: 9, Type: TileTypeProperty, Group: "lightBlue", Name: "Gran Via", Price: intPtr(120), Color: "#aae0fa"},
	{Index: 10, Type: TileTypeCorner, Group: "jail", Name: "Carcel", ShortName: "Carcel", Color: "#e67e22"},
	{Index: 11, Type: TileTypeProperty, Group: "pink", Name: "Paseo del Prado", Price: intPtr(140), Color: "#d93a96"},
	{Index: 12, Type: TileTypeUtility, Group: "utility", Name: "Cia. Electrica", ShortName: "Electrica", Price: intPtr(150), Color: "#9ed1a6"},
	{Index: 13, Type: TileTypeProperty, Group: "pink", Name: "Calle de Serrano", Price: intPtr(140), Color: "#d93a96"},
	{Index: 14, Type: TileTypeProperty, Group: "pink", Name: "Paseo de Recoletos", Price: intPtr(160), Color: "#d93a96"},
	{Index: 15, Type: TileTypeRailroad, Group: "railroad", Name: "Estacion Este", Price: intPtr(200), Color: "#2b2b2b"},
	{Index: 16, Type: TileTypeProperty, Group: "orange", Name: "Calle de Goya", Price: intPtr(180), Color: "#f7941d"},
	{Index: 17, Type: TileTypeCard, Group: "community", Name: "Arca Comunal", Color: "#3aa6e0"},
	{Index: 18, Type: TileTypeProperty, Group: "orange", Name: "Calle de Velazquez", Price: intPtr(180), Color: "#f7941d"},
	{Index: 19, Type: TileTypeProperty, Group: "orange", Name: "P. de la Castellana", ShortName: "Castellana", Price: intPtr(200), Color: "#f7941d"},
	{Index: 20, Type: TileTypeCorner, Group: "parking", Name: "Parking Gratuito", ShortName: "Parking", Color: "#c0392b"},
	{Index: 21, Type: TileTypeProperty, Group: "red", Name: "Plaza de Espana", Price: intPtr(220), Color: "#ed1b24"},
	{Index: 22, Type: TileTypeCard, Group: "chance", Name: "Suerte", Color: "#f7941d"},
	{Index: 23, Type: TileTypeProperty, Group: "red", Name: "Calle de Fuencarral", ShortName: "Fuencarral", Price: intPtr(220), Color: "#ed1b24"},
	{Index: 24, Type: TileTypeProperty, Group: "red", Name: "Paseo de la Reforma", ShortName: "Reforma", Price: intPtr(240), Color: "#ed1b24"},
	{Index: 25, Type: TileTypeRailroad, Group: "railroad", Name: "Estacion Sur", Price: intPtr(200), Color: "#2b2b2b"},
	{Index: 26, Type: TileTypeProperty, Group: "yellow", Name: "Av. de America", ShortName: "America", Price: intPtr(260), Color: "#fef200"},
	{Index: 27, Type: TileTypeProperty, Group: "yellow", Name: "Calle Bravo Murillo", ShortName: "Bravo Murillo", Price: intPtr(260), Color: "#fef200"},
	{Index: 28, Type: TileTypeUtility, Group: "utility", Name: "Cia. de Agua", ShortName: "Agua", Price: intPtr(150), Color: "#9ed1a6"},
	{Index: 29, Type: TileTypeProperty, Group: "yellow", Name: "Calle Alberto Aguilera", ShortName: "Alberto Aguilera", Price: intPtr(280), Color: "#fef200"},
	{Index: 30, Type: TileTypeCorner, Group: "gotojail", Name: "Ve a la Carcel", ShortName: "Ve Carcel", Color: "#922b21"},
	{Index: 31, Type: TileTypeProperty, Group: "green", Name: "Paseo de Gracia", Price: intPtr(300), Color: "#1fb25a"},
	{Index: 32, Type: TileTypeProperty, Group: "green", Name: "Rambla de Cataluna", Price: intPtr(300), Color: "#1fb25a"},
	{Index: 33, Type: TileTypeCard, Group: "community", Name: "Arca Comunal", Color: "#3aa6e0"},
	{Index: 34, Type: TileTypeProperty, Group: "green", Name: "Avenida Diagonal", Price: intPtr(320), Color: "#1fb25a"},
	{Index: 35, Type: TileTypeRailroad, Group: "railroad", Name: "Estacion Oeste", Price: intPtr(200), Color: "#2b2b2b"},
	{Index: 36, Type: TileTypeCard, Group: "chance", Name: "Suerte", Color: "#f7941d"},
	{Index: 37, Type: TileTypeProperty, Group: "darkBlue", Name: "Paseo de la Habana", ShortName: "La Habana", Price: intPtr(350), Color: "#0072bb"},
	{Index: 38, Type: TileTypeTax, Group: "tax", Name: "Impuesto de Lujo", ShortName: "Lujo", Color: "#5a5a5a"},
	{Index: 39, Type: TileTypeProperty, Group: "darkBlue", Name: "Paseo del Arte", Price: intPtr(400), Color: "#0072bb"},
}

// ChanceCards and CommunityCards have been moved to DB (board_cards table).
// Card data is now loaded via BoardRegistry.Register() in game/boardconfig.go.
// The hardcoded fallback lives in game/boardconfig.go as hardcodedChanceCards/hardcodedCommunityCards.
