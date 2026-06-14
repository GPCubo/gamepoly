package game

import (
	"time"

	"gamepolyweb/backend/internal/config"
)

type Phase string

const (
	PhaseSetup   Phase = "setup"
	PhasePlaying Phase = "playing"
)

type BotDifficulty string

const (
	BotRegular   BotDifficulty = "regular"
	BotDifficult BotDifficulty = "difficult"
)

type PlayerState struct {
	ID                 string        `json:"id"`
	Name               string        `json:"name"`
	TokenModel         string        `json:"tokenModel"`
	Position           int           `json:"position"`
	Cash               int           `json:"cash"`
	InJail             bool          `json:"inJail"`
	JailTurns          int           `json:"jailTurns"`
	ConsecutiveDoubles int           `json:"consecutiveDoubles"`
	IsBot              bool          `json:"isBot"`
	BotDifficulty      BotDifficulty `json:"botDifficulty,omitempty"`
	Connected          bool          `json:"connected"`
	ControlledByBot    bool          `json:"controlledByBot"`
	DisconnectedAt     int64         `json:"disconnectedAt,omitempty"`
	ReconnectGraceMs   int           `json:"reconnectGraceMs,omitempty"`
}

type PropertyDevelopment struct {
	Houses    int  `json:"houses"`
	Hotel     bool `json:"hotel"`
	Mortgaged bool `json:"mortgaged"`
}

type ExchangeProposal struct {
	FromPlayerID       string `json:"fromPlayerId"`
	ToPlayerID         string `json:"toPlayerId"`
	OfferProperties    []int  `json:"offerProperties"`
	OfferMoney         int    `json:"offerMoney"`
	RequestProperties  []int  `json:"requestProperties"`
	RequestMoney       int    `json:"requestMoney"`
	RenegotiationCount int    `json:"renegotiationCount"`
}

type EconomicHistoryType string

const (
	HistPurchase        EconomicHistoryType = "purchase"
	HistAuction         EconomicHistoryType = "auction"
	HistMortgage        EconomicHistoryType = "mortgage"
	HistUnmortgage      EconomicHistoryType = "unmortgage"
	HistGo              EconomicHistoryType = "go"
	HistBuild           EconomicHistoryType = "build"
	HistSellImprovement EconomicHistoryType = "sell_improvement"
	HistCardGain        EconomicHistoryType = "card_gain"
	HistCardLoss        EconomicHistoryType = "card_loss"
	HistTax             EconomicHistoryType = "tax"
	HistRent            EconomicHistoryType = "rent"
	HistExchange        EconomicHistoryType = "exchange"
)

type EconomicHistoryItem struct {
	ID           int                    `json:"id"`
	Type         EconomicHistoryType    `json:"type"`
	Title        string                 `json:"title"`
	Detail       string                 `json:"detail"`
	TitleKey     string                 `json:"titleKey,omitempty"`
	DetailKey    string                 `json:"detailKey,omitempty"`
	MessageParams map[string]any        `json:"params,omitempty"`
	Amount       *int                   `json:"amount,omitempty"`
	PlayerIDs    []string               `json:"playerIds"`
	CreatedAt    int64                 `json:"createdAt"`
}

// AuctionState holds all state for an ongoing auction.
type AuctionState struct {
	TileIndex    int      `json:"tileIndex"`
	CurrentBid   int      `json:"currentBid"`
	LeaderID     string   `json:"leaderId"`
	ActiveBidders []string `json:"activeBidders"`
	BidderIdx    int      `json:"bidderIdx"`
}

type StartOrderStatus string

const (
	StartOrderWaiting  StartOrderStatus = "waiting"
	StartOrderRolling  StartOrderStatus = "rolling"
	StartOrderTiebreak StartOrderStatus = "tiebreak"
	StartOrderComplete StartOrderStatus = "complete"
)

type StartOrderRoll struct {
	PlayerID   string `json:"playerId"`
	PlayerName string `json:"playerName"`
	DiceValues [2]int `json:"diceValues"`
	Total      int    `json:"total"`
	Round      int    `json:"round"`
	RolledAt   int64  `json:"rolledAt"`
}

type StartOrderState struct {
	Status            StartOrderStatus `json:"status"`
	Round             int              `json:"round"`
	RequiredPlayerIDs []string         `json:"requiredPlayerIds"`
	TiedPlayerIDs     []string         `json:"tiedPlayerIds"`
	WinnerID          string           `json:"winnerId,omitempty"`
	Rolls             []StartOrderRoll `json:"rolls"`
}

type GameState struct {
	Phase     Phase  `json:"phase"`
	TableID   string `json:"tableId"`
	BoardSlug string `json:"boardSlug,omitempty"`

	Players                     []*PlayerState `json:"players"`
	ActivePlayerIndex           int            `json:"activePlayerIndex"`
	IsTurnComplete              bool           `json:"isTurnComplete"`
	IsDoubles                   bool           `json:"isDoubles"`
	DiceValues                  [2]int         `json:"diceValues"`
	StatusMessage               string         `json:"statusMessage"`
	StatusMessageKey            string         `json:"statusMessageKey,omitempty"`
	StatusMessageParams         map[string]any `json:"statusMessageParams,omitempty"`
	ForceAllDiceRollsAsDoubles bool           `json:"-"`
	ForceAllDiceRollsToCards   bool           `json:"-"`
	GoSalary                    int            `json:"goSalary"`
	JailBailCost                int            `json:"jailBailCost"`
	CanSkipBuy                  bool           `json:"canSkipBuy"`
	AuctionOnly                 bool           `json:"auctionOnly"`
	DoublesGiveExtra            bool           `json:"doublesGiveExtraTurn"`
	TurnDeadlineAt              int64          `json:"turnDeadlineAt,omitempty"`
	TurnDurationMs              int            `json:"turnDurationMs,omitempty"`

	PropertyOwners       map[int]string              `json:"propertyOwners"`
	PropertyDevelopments map[int]PropertyDevelopment `json:"propertyDevelopments"`
	BankruptPlayers      []string                    `json:"bankruptPlayers"`

	IsAuctionActive     bool                    `json:"isAuctionActive"`
	Auction             *AuctionState           `json:"auction,omitempty"`
	ExchangeProposal    *ExchangeProposal       `json:"exchangeProposal,omitempty"`
	StartOrder          *StartOrderState        `json:"startOrder,omitempty"`

	ActiveCard    *config.GameCard `json:"activeCard,omitempty"`
	ChanceDeck    []int            `json:"chanceDeck"`
	CommunityDeck []int            `json:"communityDeck"`

	EconomicHistory        []EconomicHistoryItem `json:"economicHistory"`
	MovementHistory        []MovementHistoryItem `json:"movementHistory"`
	CardHistory            []CardHistoryItem     `json:"cardHistory"`
	HistoryCounter         int                   `json:"-"`
	MovementHistoryCounter int                   `json:"-"`
	CardHistoryCounter     int                   `json:"-"`
}

// helpers

func (gs *GameState) ActivePlayer() *PlayerState {
	if gs.ActivePlayerIndex < 0 || gs.ActivePlayerIndex >= len(gs.Players) {
		return nil
	}
	return gs.Players[gs.ActivePlayerIndex]
}

func (gs *GameState) FindPlayer(id string) *PlayerState {
	for _, p := range gs.Players {
		if p.ID == id {
			return p
		}
	}
	return nil
}

func (gs *GameState) IsBankrupt(id string) bool {
	for _, bid := range gs.BankruptPlayers {
		if bid == id {
			return true
		}
	}
	return false
}

func (gs *GameState) ActivePlayers() []*PlayerState {
	var result []*PlayerState
	for _, p := range gs.Players {
		if !gs.IsBankrupt(p.ID) {
			result = append(result, p)
		}
	}
	return result
}

func (gs *GameState) GetDevelopment(tileIndex int) PropertyDevelopment {
	if d, ok := gs.PropertyDevelopments[tileIndex]; ok {
		return d
	}
	return PropertyDevelopment{}
}

func (gs *GameState) EnsureDevelopment(tileIndex int) *PropertyDevelopment {
	if _, ok := gs.PropertyDevelopments[tileIndex]; !ok {
		gs.PropertyDevelopments[tileIndex] = PropertyDevelopment{}
	}
	d := gs.PropertyDevelopments[tileIndex]
	return &d
}

func (gs *GameState) SetDevelopment(tileIndex int, d PropertyDevelopment) {
	gs.PropertyDevelopments[tileIndex] = d
}

func (gs *GameState) AddHistory(item EconomicHistoryItem) {
	gs.HistoryCounter++
	item.ID = gs.HistoryCounter
	item.CreatedAt = time.Now().UnixMilli()
	gs.EconomicHistory = append([]EconomicHistoryItem{item}, gs.EconomicHistory...)
	if len(gs.EconomicHistory) > 100 {
		gs.EconomicHistory = gs.EconomicHistory[:100]
	}
}

func (gs *GameState) Winner() *PlayerState {
	if gs.Phase != PhasePlaying {
		return nil
	}
	alive := gs.ActivePlayers()
	if len(alive) == 1 {
		return alive[0]
	}
	return nil
}

func NewGameState(tableID string) *GameState {
	return &GameState{
		Phase:                PhaseSetup,
		TableID:              tableID,
		Players:              []*PlayerState{},
		PropertyOwners:       make(map[int]string),
		PropertyDevelopments: make(map[int]PropertyDevelopment),
		BankruptPlayers:      []string{},
		DiceValues:           [2]int{1, 1},
		GoSalary:             200,
		JailBailCost:         50,
		DoublesGiveExtra:     true,
		EconomicHistory:      []EconomicHistoryItem{},
		MovementHistory:      []MovementHistoryItem{},
		CardHistory:          []CardHistoryItem{},
	}
}
