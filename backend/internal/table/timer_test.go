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
