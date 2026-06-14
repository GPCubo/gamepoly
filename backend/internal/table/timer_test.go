package table

import (
	"testing"

	"gamepolyweb/backend/internal/game"
)

func TestRemoveConnMarksHumanAsBotControlled(t *testing.T) {
	tbl := NewTable("T-test", []PlayerSlot{
		{ID: "p1", Name: "Ana", TokenModel: "sombrero.glb", IsBot: false},
		{ID: "p2", Name: "Luis", TokenModel: "dedal.glb", IsBot: false},
	}, game.GameOptions{GoSalary: 200, JailBailCost: 50}, nil)

	tbl.RemoveConn("p1")

	player := tbl.State.FindPlayer("p1")
	if player == nil {
		t.Fatalf("expected player")
	}
	if player.IsBot {
		t.Fatalf("human identity should not become a real bot")
	}
	if player.Connected {
		t.Fatalf("expected player to be disconnected")
	}
	if !player.ControlledByBot {
		t.Fatalf("expected temporary bot control")
	}
	if player.DisconnectedAt == 0 {
		t.Fatalf("expected disconnection timestamp")
	}
}

func TestTurnTimeoutAdvancesCompletedTurn(t *testing.T) {
	tbl := NewTable("T-test", []PlayerSlot{
		{ID: "p1", Name: "Ana", TokenModel: "sombrero.glb", IsBot: false},
		{ID: "p2", Name: "Luis", TokenModel: "dedal.glb", IsBot: false},
	}, game.GameOptions{GoSalary: 200, JailBailCost: 50}, nil)
	tbl.State.ActivePlayerIndex = 0
	tbl.State.IsTurnComplete = true

	tbl.handleTurnTimeout()

	if tbl.State.ActivePlayerIndex != 1 {
		t.Fatalf("expected timeout to advance turn, got active index %d", tbl.State.ActivePlayerIndex)
	}
}

func TestTurnTimeoutMortgagesCheapestPropertiesForDebt(t *testing.T) {
	tbl := NewTable("T-test", []PlayerSlot{
		{ID: "p1", Name: "Ana", TokenModel: "sombrero.glb", IsBot: false},
		{ID: "p2", Name: "Luis", TokenModel: "dedal.glb", IsBot: false},
	}, game.GameOptions{GoSalary: 200, JailBailCost: 50}, nil)
	tbl.State.ActivePlayerIndex = 0
	tbl.State.IsTurnComplete = true
	tbl.State.FindPlayer("p1").Cash = -30
	tbl.State.PropertyOwners[1] = "p1" // price 60, mortgage 30
	tbl.State.PropertyOwners[6] = "p1" // price 100, should remain unmortgaged

	tbl.handleTurnTimeout()

	if got := tbl.State.FindPlayer("p1").Cash; got != 0 {
		t.Fatalf("expected debt covered exactly, got cash %d", got)
	}
	if !tbl.State.GetDevelopment(1).Mortgaged {
		t.Fatalf("expected cheapest property to be mortgaged")
	}
	if tbl.State.GetDevelopment(6).Mortgaged {
		t.Fatalf("did not expect more expensive property to be mortgaged")
	}
	if tbl.State.IsBankrupt("p1") {
		t.Fatalf("player should not be bankrupt after covering debt")
	}
}

func TestTurnTimeoutDeclaresBankruptcyWhenMortgageCannotCoverDebt(t *testing.T) {
	tbl := NewTable("T-test", []PlayerSlot{
		{ID: "p1", Name: "Ana", TokenModel: "sombrero.glb", IsBot: false},
		{ID: "p2", Name: "Luis", TokenModel: "dedal.glb", IsBot: false},
	}, game.GameOptions{GoSalary: 200, JailBailCost: 50}, nil)
	tbl.State.ActivePlayerIndex = 0
	tbl.State.IsTurnComplete = true
	tbl.State.FindPlayer("p1").Cash = -100
	tbl.State.PropertyOwners[1] = "p1" // only mortgage value 30

	tbl.handleTurnTimeout()

	if !tbl.State.IsBankrupt("p1") {
		t.Fatalf("expected player to go bankrupt")
	}
	if tbl.State.Winner() == nil || tbl.State.Winner().ID != "p2" {
		t.Fatalf("expected remaining player to win")
	}
}
