package game

import (
	"fmt"
	"time"

	"gamepolyweb/backend/internal/config"
)

type MovementHistoryItem struct {
	ID         int    `json:"id"`
	PlayerID   string `json:"playerId"`
	PlayerName string `json:"playerName"`
	Source     string `json:"source"`
	DiceValues [2]int `json:"diceValues"`
	DiceTotal  int    `json:"diceTotal"`
	From       int    `json:"from"`
	To         int    `json:"to"`
	CardID     string `json:"cardId,omitempty"`
	CardText   string `json:"cardText,omitempty"`
	CreatedAt  int64  `json:"createdAt"`
}

type CardHistoryItem struct {
	ID         int                   `json:"id"`
	PlayerID   string                `json:"playerId"`
	PlayerName string                `json:"playerName"`
	CardID     string                `json:"cardId"`
	Group      string                `json:"group"`
	Text       string                `json:"text"`
	Action     config.CardActionType `json:"action"`
	Amount     *int                  `json:"amount,omitempty"`
	TileIndex  *int                  `json:"tileIndex,omitempty"`
	Effect     string                `json:"effect"`
	CreatedAt  int64                 `json:"createdAt"`
}

func (gs *GameState) AddMovementHistory(item MovementHistoryItem) {
	gs.MovementHistoryCounter++
	item.ID = gs.MovementHistoryCounter
	item.CreatedAt = time.Now().UnixMilli()
	gs.MovementHistory = append([]MovementHistoryItem{item}, gs.MovementHistory...)
	if len(gs.MovementHistory) > 100 {
		gs.MovementHistory = gs.MovementHistory[:100]
	}
}

func (gs *GameState) AddCardHistory(item CardHistoryItem) {
	gs.CardHistoryCounter++
	item.ID = gs.CardHistoryCounter
	item.CreatedAt = time.Now().UnixMilli()
	item.Effect = cardEffectDescription(item)
	gs.CardHistory = append([]CardHistoryItem{item}, gs.CardHistory...)
	if len(gs.CardHistory) > 100 {
		gs.CardHistory = gs.CardHistory[:100]
	}
}

func NewCardHistoryItem(player *PlayerState, card config.GameCard) CardHistoryItem {
	item := CardHistoryItem{
		CardID:    card.ID,
		Group:     card.Group,
		Text:      card.Text,
		Action:    card.Action,
		Amount:    card.Amount,
		TileIndex: card.TileIndex,
	}
	if player != nil {
		item.PlayerID = player.ID
		item.PlayerName = player.Name
	}
	return item
}

func cardEffectDescription(item CardHistoryItem) string {
	switch item.Action {
	case config.CardMoveTo:
		if item.TileIndex != nil {
			if tile := config.GetTile(*item.TileIndex); tile != nil {
				return fmt.Sprintf("Mover a %s", tile.Name)
			}
			return fmt.Sprintf("Mover a casilla %d", *item.TileIndex+1)
		}
	case config.CardMoveSteps:
		if item.Amount != nil {
			if *item.Amount >= 0 {
				return fmt.Sprintf("Avanzar %d casillas", *item.Amount)
			}
			return fmt.Sprintf("Retroceder %d casillas", -*item.Amount)
		}
	case config.CardCollect:
		if item.Amount != nil {
			return fmt.Sprintf("Cobrar $%d", *item.Amount)
		}
	case config.CardPay:
		if item.Amount != nil {
			return fmt.Sprintf("Pagar $%d", *item.Amount)
		}
	case config.CardPayEach:
		if item.Amount != nil {
			return fmt.Sprintf("Pagar $%d a cada jugador", *item.Amount)
		}
	case config.CardGoToJail:
		return "Ir a la carcel"
	}
	return "Aplicar efecto de tarjeta"
}
