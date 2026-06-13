package table

import (
	"testing"

	"gamepolyweb/backend/internal/game"
)

func TestRollStartOrderBotsParticipateInSetup(t *testing.T) {
	tbl := NewTable("T-test", []PlayerSlot{
		{ID: "p1", Name: "Ana", TokenModel: "sombrero.glb", IsBot: false},
		{ID: "b1", Name: "Bot", TokenModel: "coffee.glb", IsBot: true, Difficulty: game.BotRegular},
	}, game.GameOptions{GoSalary: 200, JailBailCost: 50, StartInSetup: true}, nil)

	tbl.rollStartOrderBots()

	if tbl.State.StartOrder == nil {
		t.Fatalf("expected start order state")
	}
	foundBotRoll := false
	for _, roll := range tbl.State.StartOrder.Rolls {
		if roll.PlayerID == "b1" {
			foundBotRoll = true
		}
	}
	if !foundBotRoll {
		t.Fatalf("expected bot to roll in start order, got %#v", tbl.State.StartOrder.Rolls)
	}
	if tbl.State.Phase != game.PhaseSetup {
		t.Fatalf("expected setup until human rolls, got %s", tbl.State.Phase)
	}
}
