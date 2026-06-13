package game

import (
	"errors"
	"math/rand"
	"time"
)

func IsOpenPlayer(p *PlayerState) bool {
	return p == nil || p.Name == "" || p.Name == "open"
}

func OpenSlotCount(gs *GameState) int {
	count := 0
	for _, p := range gs.Players {
		if IsOpenPlayer(p) {
			count++
		}
	}
	return count
}

func occupiedStartOrderPlayerIDs(gs *GameState) []string {
	ids := []string{}
	for _, p := range gs.Players {
		if IsOpenPlayer(p) || gs.IsBankrupt(p.ID) {
			continue
		}
		ids = append(ids, p.ID)
	}
	return ids
}

func EnsureStartOrder(gs *GameState) {
	if gs.Phase != PhaseSetup {
		return
	}
	if OpenSlotCount(gs) > 0 {
		gs.StartOrder = &StartOrderState{
			Status: StartOrderWaiting,
			Round:  1,
			Rolls:  []StartOrderRoll{},
		}
		gs.StatusMessage = "Comparte la invitacion y espera a que se unan los jugadores."
		return
	}

	if gs.StartOrder == nil || gs.StartOrder.Status == StartOrderWaiting {
		required := occupiedStartOrderPlayerIDs(gs)
		gs.StartOrder = &StartOrderState{
			Status:            StartOrderRolling,
			Round:             1,
			RequiredPlayerIDs: required,
			Rolls:             []StartOrderRoll{},
		}
		gs.StatusMessage = "Tiren dados para decidir quien empieza."
	}
}

func RollStartOrderRandom(gs *GameState, playerID string) (StartOrderRoll, error) {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	return RollStartOrder(gs, playerID, r.Intn(6)+1, r.Intn(6)+1)
}

func RollStartOrder(gs *GameState, playerID string, d1 int, d2 int) (StartOrderRoll, error) {
	if gs.Phase != PhaseSetup {
		return StartOrderRoll{}, errors.New("la partida ya inicio")
	}
	EnsureStartOrder(gs)
	if gs.StartOrder == nil || gs.StartOrder.Status == StartOrderWaiting {
		return StartOrderRoll{}, errors.New("la sala aun espera jugadores")
	}
	if d1 < 1 || d1 > 6 || d2 < 1 || d2 > 6 {
		return StartOrderRoll{}, errors.New("dados invalidos")
	}
	if !containsString(gs.StartOrder.RequiredPlayerIDs, playerID) {
		return StartOrderRoll{}, errors.New("no te toca tirar para el orden inicial")
	}
	for _, roll := range gs.StartOrder.Rolls {
		if roll.Round == gs.StartOrder.Round && roll.PlayerID == playerID {
			return StartOrderRoll{}, errors.New("ya tiraste en esta ronda")
		}
	}
	player := gs.FindPlayer(playerID)
	if player == nil || IsOpenPlayer(player) {
		return StartOrderRoll{}, errors.New("jugador no encontrado")
	}

	roll := StartOrderRoll{
		PlayerID:   player.ID,
		PlayerName: player.Name,
		DiceValues: [2]int{d1, d2},
		Total:      d1 + d2,
		Round:      gs.StartOrder.Round,
		RolledAt:   time.Now().UnixMilli(),
	}
	gs.StartOrder.Rolls = append(gs.StartOrder.Rolls, roll)
	resolveStartOrderRound(gs)
	return roll, nil
}

func resolveStartOrderRound(gs *GameState) {
	if gs.StartOrder == nil {
		return
	}
	currentRolls := []StartOrderRoll{}
	for _, roll := range gs.StartOrder.Rolls {
		if roll.Round == gs.StartOrder.Round {
			currentRolls = append(currentRolls, roll)
		}
	}
	if len(currentRolls) < len(gs.StartOrder.RequiredPlayerIDs) {
		gs.StatusMessage = "Esperando tiradas para definir quien empieza."
		return
	}

	maxTotal := -1
	tied := []string{}
	for _, roll := range currentRolls {
		if roll.Total > maxTotal {
			maxTotal = roll.Total
			tied = []string{roll.PlayerID}
		} else if roll.Total == maxTotal {
			tied = append(tied, roll.PlayerID)
		}
	}

	if len(tied) == 1 {
		StartGameWithFirstPlayer(gs, tied[0])
		return
	}

	gs.StartOrder.Status = StartOrderTiebreak
	gs.StartOrder.Round++
	gs.StartOrder.RequiredPlayerIDs = tied
	gs.StartOrder.TiedPlayerIDs = tied
	gs.StatusMessage = "Empate en la tirada mayor. Los empatados vuelven a tirar."
}

func StartGameWithFirstPlayer(gs *GameState, playerID string) {
	for idx, p := range gs.Players {
		if p.ID == playerID {
			gs.ActivePlayerIndex = idx
			break
		}
	}
	if gs.StartOrder != nil {
		gs.StartOrder.Status = StartOrderComplete
		gs.StartOrder.WinnerID = playerID
		gs.StartOrder.TiedPlayerIDs = nil
	}
	gs.Phase = PhasePlaying
	gs.IsTurnComplete = false
	if p := gs.FindPlayer(playerID); p != nil {
		gs.StatusMessage = "¡" + p.Name + " comienza!"
	}
}

func HasStartOrderRollThisRound(gs *GameState, playerID string) bool {
	if gs.StartOrder == nil {
		return false
	}
	for _, roll := range gs.StartOrder.Rolls {
		if roll.Round == gs.StartOrder.Round && roll.PlayerID == playerID {
			return true
		}
	}
	return false
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
