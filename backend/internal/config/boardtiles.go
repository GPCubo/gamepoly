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

var ChanceCards = []GameCard{
	{ID: "ch01", Group: "chance", Text: "Avanza a {tileName}. Cobra $200.", Action: CardMoveTo, TileIndex: intPtr(0)},
	{ID: "ch02", Group: "chance", Text: "Avanza a {tileName}.", Action: CardMoveTo, TileIndex: intPtr(11)},
	{ID: "ch03", Group: "chance", Text: "Avanza a {tileName}.", Action: CardMoveTo, TileIndex: intPtr(8)},
	{ID: "ch04", Group: "chance", Text: "Avanza a {tileName}.", Action: CardMoveTo, TileIndex: intPtr(5)},
	{ID: "ch05", Group: "chance", Text: "Avanza a {tileName}.", Action: CardMoveTo, TileIndex: intPtr(25)},
	{ID: "ch06", Group: "chance", Text: "Retrocede 3 casillas.", Action: CardMoveSteps, Amount: intPtr(-3)},
	{ID: "ch07", Group: "chance", Text: "Ve a {tileName}. No pases por la Salida.", Action: CardGoToJail, TileIndex: intPtr(10)},
	{ID: "ch08", Group: "chance", Text: "Cobra $50 del banco.", Action: CardCollect, Amount: intPtr(50)},
	{ID: "ch09", Group: "chance", Text: "Cobra $150 del banco.", Action: CardCollect, Amount: intPtr(150)},
	{ID: "ch10", Group: "chance", Text: "Paga $50 de multa.", Action: CardPay, Amount: intPtr(50)},
	{ID: "ch11", Group: "chance", Text: "Paga $100 de multa.", Action: CardPay, Amount: intPtr(100)},
	{ID: "ch12", Group: "chance", Text: "Paga $25 a cada jugador.", Action: CardPayEach, Amount: intPtr(25)},
	{ID: "ch13", Group: "chance", Text: "Tus inversiones te dan frutos. Cobra $100.", Action: CardCollect, Amount: intPtr(100)},
	{ID: "ch14", Group: "chance", Text: "Avanza a {tileName}.", Action: CardMoveTo, TileIndex: intPtr(24)},
	{ID: "ch15", Group: "chance", Text: "Avanza a {tileName}.", Action: CardMoveTo, TileIndex: intPtr(34)},
	{ID: "ch16", Group: "chance", Text: "Banco te paga dividendos: $20.", Action: CardCollect, Amount: intPtr(20)},
}

var CommunityCards = []GameCard{
	{ID: "co01", Group: "community", Text: "Avanza a {tileName}. Cobra $200.", Action: CardMoveTo, TileIndex: intPtr(0)},
	{ID: "co02", Group: "community", Text: "Error bancario a tu favor. Cobra $200.", Action: CardCollect, Amount: intPtr(200)},
	{ID: "co03", Group: "community", Text: "Gastos medicos. Paga $50.", Action: CardPay, Amount: intPtr(50)},
	{ID: "co04", Group: "community", Text: "Gastos del medico. Paga $100.", Action: CardPay, Amount: intPtr(100)},
	{ID: "co05", Group: "community", Text: "Paga $50 a cada jugador por una cena de gala.", Action: CardPayEach, Amount: intPtr(50)},
	{ID: "co06", Group: "community", Text: "Cobra $45 de intereses de tus inversiones.", Action: CardCollect, Amount: intPtr(45)},
	{ID: "co07", Group: "community", Text: "Ve a {tileName}. No pases por la Salida.", Action: CardGoToJail, TileIndex: intPtr(10)},
	{ID: "co08", Group: "community", Text: "Herencia: cobra $100.", Action: CardCollect, Amount: intPtr(100)},
	{ID: "co09", Group: "community", Text: "Cobra $25 por servicios consultivos.", Action: CardCollect, Amount: intPtr(25)},
	{ID: "co10", Group: "community", Text: "Paga $75 por taxes de escuela.", Action: CardPay, Amount: intPtr(75)},
	{ID: "co11", Group: "community", Text: "Cobra $10 de dividendos.", Action: CardCollect, Amount: intPtr(10)},
	{ID: "co12", Group: "community", Text: "Es tu cumpleanios. Cobra $10 de cada jugador.", Action: CardCollect, Amount: intPtr(10)},
	{ID: "co13", Group: "community", Text: "Seguro de vida vence. Cobra $100.", Action: CardCollect, Amount: intPtr(100)},
	{ID: "co14", Group: "community", Text: "Paga $50 por hospitalizacion.", Action: CardPay, Amount: intPtr(50)},
	{ID: "co15", Group: "community", Text: "Paga $150 por multa de trafico.", Action: CardPay, Amount: intPtr(150)},
	{ID: "co16", Group: "community", Text: "Ganaste un concurso de crucigramas. Cobra $100.", Action: CardCollect, Amount: intPtr(100)},
}

func GetTile(index int) *BoardTile {
	for i := range BoardTiles {
		if BoardTiles[i].Index == index {
			return &BoardTiles[i]
		}
	}
	return nil
}

func GetGroupTiles(group string, tileType TileType) []BoardTile {
	var result []BoardTile
	for _, t := range BoardTiles {
		if t.Group == group && t.Type == tileType {
			result = append(result, t)
		}
	}
	return result
}

func GetOwnableTile(index int) *BoardTile {
	t := GetTile(index)
	if t == nil || t.Price == nil {
		return nil
	}
	return t
}

func IsOwnableTile(t *BoardTile) bool {
	return t.Type == TileTypeProperty || t.Type == TileTypeRailroad || t.Type == TileTypeUtility
}

func ShuffleDeck(size int) []int {
	deck := make([]int, size)
	for i := range deck {
		deck[i] = i
	}
	// Fisher-Yates
	for i := size - 1; i > 0; i-- {
		j := int(pseudoRand(int64(i + 1)))
		deck[i], deck[j] = deck[j], deck[i]
	}
	return deck
}

var randSeed int64 = 42

func pseudoRand(n int64) int64 {
	randSeed = (randSeed*6364136223846793005 + 1442695040888963407)
	r := (randSeed >> 33) & 0x7fffffff
	if n <= 0 {
		return 0
	}
	return r % n
}

func ResolveCardText(card GameCard) string {
	if card.TileIndex == nil {
		return card.Text
	}
	tile := GetTile(*card.TileIndex)
	if tile == nil {
		return card.Text
	}
	result := card.Text
	old := "{tileName}"
	new := tile.Name
	for i := 0; i < len(result)-len(old)+1; i++ {
		if result[i:i+len(old)] == old {
			result = result[:i] + new + result[i+len(old):]
			break
		}
	}
	return result
}
