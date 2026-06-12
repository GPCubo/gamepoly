// Package proto defines the WebSocket message types shared between
// the table and api packages. It has no imports from other internal packages.
package proto

import (
	"encoding/json"

	"gamepolyweb/backend/internal/game"
)

// IncomingMsg is the envelope for client → server messages.
type IncomingMsg struct {
	V        int             `json:"v"`
	ID       string          `json:"id"`
	Type     string          `json:"type"`
	TableID  string          `json:"tableId"`
	PlayerID string          `json:"playerId"`
	Seq      int             `json:"seq"`
	Payload  json.RawMessage `json:"payload,omitempty"`
}

// OutgoingMsg is the envelope for server → client messages.
type OutgoingMsg struct {
	V       int    `json:"v"`
	Type    string `json:"type"`
	Payload any    `json:"payload,omitempty"`
}

func New(msgType string, payload any) OutgoingMsg {
	return OutgoingMsg{V: 1, Type: msgType, Payload: payload}
}

func NewError(code, message string) OutgoingMsg {
	return New("error", map[string]string{"code": code, "message": message})
}

func NewSnapshot(state *game.GameState) OutgoingMsg {
	return New("game_snapshot", map[string]*game.GameState{"state": state})
}

// ─── client → server payloads ────────────────────────────────────────────────

type BuyPropertyPayload struct {
	TileIndex int `json:"tileIndex"`
}

type PlaceBidPayload struct {
	Increment int `json:"increment"`
}

type BuildPayload struct {
	TileIndex int `json:"tileIndex"`
}

type MortgagePayload struct {
	TileIndex int `json:"tileIndex"`
}

type ProposeTradePayload struct {
	Proposal game.ExchangeProposal `json:"proposal"`
}

type RespondTradePayload struct {
	Accepted bool `json:"accepted"`
}

// ─── server → client payloads ────────────────────────────────────────────────

type PlayerConnectedPayload struct {
	PlayerID string `json:"playerId"`
	Name     string `json:"name"`
}

type PlayerDisconnectedPayload struct {
	PlayerID      string `json:"playerId"`
	GracePeriodMs int    `json:"gracePeriodMs"`
}

type DiceRolledPayload struct {
	Values    [2]int `json:"values"`
	Total     int    `json:"total"`
	IsDoubles bool   `json:"isDoubles"`
}

type PlayerMovedPayload struct {
	PlayerID string `json:"playerId"`
	From     int    `json:"from"`
	To       int    `json:"to"`
	Path     []int  `json:"path"`
}

type PropertyPurchasedPayload struct {
	TileIndex int    `json:"tileIndex"`
	PlayerID  string `json:"playerId"`
	Amount    int    `json:"amount"`
}

type AuctionStartedPayload struct {
	TileIndex           int `json:"tileIndex"`
	StartingBidderIndex int `json:"startingBidderIndex"`
}

type BidPlacedPayload struct {
	PlayerID string `json:"playerId"`
	Amount   int    `json:"amount"`
}

type BidPassedPayload struct {
	PlayerID string `json:"playerId"`
}

type AuctionEndedPayload struct {
	WinnerID  string `json:"winnerId,omitempty"`
	Amount    int    `json:"amount,omitempty"`
	TileIndex int    `json:"tileIndex"`
}

type CardDrawnPayload struct {
	PlayerID string `json:"playerId"`
	CardID   string `json:"cardId"`
	Text     string `json:"text"`
}

type RentCollectedPayload struct {
	FromID    string `json:"fromId"`
	ToID      string `json:"toId"`
	Amount    int    `json:"amount"`
	TileIndex int    `json:"tileIndex"`
}

type TaxPaidPayload struct {
	PlayerID  string `json:"playerId"`
	Amount    int    `json:"amount"`
	TileIndex int    `json:"tileIndex"`
}

type TradeProposedPayload struct {
	Proposal game.ExchangeProposal `json:"proposal"`
}

type TradeRespondedPayload struct {
	Accepted bool   `json:"accepted"`
	Summary  string `json:"summary,omitempty"`
}

type PlayerJailedPayload struct {
	PlayerID string `json:"playerId"`
}

type PlayerBankruptPayload struct {
	PlayerID string `json:"playerId"`
}

type GameOverPayload struct {
	WinnerID string `json:"winnerId"`
}

type TurnTimeoutPayload struct {
	PlayerID     string `json:"playerId"`
	NextPlayerID string `json:"nextPlayerId"`
}

type BotThinkingPayload struct {
	PlayerID string `json:"playerId"`
	DelayMs  int    `json:"delayMs"`
}

type BotActionPayload struct {
	PlayerID string `json:"playerId"`
	Action   string `json:"action"`
	TileIndex int   `json:"tileIndex,omitempty"`
}

type HouseBuiltPayload struct {
	PlayerID  string `json:"playerId"`
	TileIndex int    `json:"tileIndex"`
}

type HotelBuiltPayload struct {
	PlayerID  string `json:"playerId"`
	TileIndex int    `json:"tileIndex"`
}

type PropertyMortgagedPayload struct {
	PlayerID  string `json:"playerId"`
	TileIndex int    `json:"tileIndex"`
}
