package game

import "testing"

func newStartOrderTestState() *GameState {
	gs := NewGameState("T-test")
	SetupGame(gs, []SlotConfig{
		{ID: "p1", Name: "Ana", StartingCash: 1500},
		{ID: "p2", Name: "Luis", StartingCash: 1500},
		{ID: "p3", Name: "Mia", StartingCash: 1500},
	}, GameOptions{GoSalary: 200, JailBailCost: 50, StartInSetup: true})
	return gs
}

func TestRollStartOrderWinnerStartsGame(t *testing.T) {
	gs := newStartOrderTestState()

	if _, err := RollStartOrder(gs, "p1", 3, 3); err != nil {
		t.Fatalf("p1 roll failed: %v", err)
	}
	if _, err := RollStartOrder(gs, "p2", 5, 6); err != nil {
		t.Fatalf("p2 roll failed: %v", err)
	}
	if _, err := RollStartOrder(gs, "p3", 2, 2); err != nil {
		t.Fatalf("p3 roll failed: %v", err)
	}

	if gs.Phase != PhasePlaying {
		t.Fatalf("expected playing phase, got %s", gs.Phase)
	}
	if gs.ActivePlayerIndex != 1 {
		t.Fatalf("expected p2 active index 1, got %d", gs.ActivePlayerIndex)
	}
	if gs.StartOrder == nil || gs.StartOrder.WinnerID != "p2" {
		t.Fatalf("expected p2 winner, got %#v", gs.StartOrder)
	}
}

func TestRollStartOrderTiebreakOnlyTiedPlayersRollAgain(t *testing.T) {
	gs := newStartOrderTestState()

	if _, err := RollStartOrder(gs, "p1", 6, 4); err != nil {
		t.Fatalf("p1 roll failed: %v", err)
	}
	if _, err := RollStartOrder(gs, "p2", 5, 5); err != nil {
		t.Fatalf("p2 roll failed: %v", err)
	}
	if _, err := RollStartOrder(gs, "p3", 3, 3); err != nil {
		t.Fatalf("p3 roll failed: %v", err)
	}

	if gs.StartOrder.Status != StartOrderTiebreak {
		t.Fatalf("expected tiebreak, got %s", gs.StartOrder.Status)
	}
	if gs.StartOrder.Round != 2 {
		t.Fatalf("expected round 2, got %d", gs.StartOrder.Round)
	}
	if len(gs.StartOrder.RequiredPlayerIDs) != 2 {
		t.Fatalf("expected 2 tied players, got %v", gs.StartOrder.RequiredPlayerIDs)
	}
	if _, err := RollStartOrder(gs, "p3", 6, 6); err == nil {
		t.Fatalf("expected non-tied player to be rejected")
	}

	if _, err := RollStartOrder(gs, "p1", 1, 1); err != nil {
		t.Fatalf("p1 tiebreak roll failed: %v", err)
	}
	if _, err := RollStartOrder(gs, "p2", 2, 2); err != nil {
		t.Fatalf("p2 tiebreak roll failed: %v", err)
	}
	if gs.Phase != PhasePlaying || gs.StartOrder.WinnerID != "p2" {
		t.Fatalf("expected p2 to win tiebreak, phase=%s order=%#v", gs.Phase, gs.StartOrder)
	}
}

func TestEnsureStartOrderWaitsForOpenSlots(t *testing.T) {
	gs := NewGameState("T-test")
	SetupGame(gs, []SlotConfig{
		{ID: "p1", Name: "Ana", StartingCash: 1500},
		{ID: "p2", Name: "open", StartingCash: 1500},
	}, GameOptions{GoSalary: 200, JailBailCost: 50, StartInSetup: true})

	if gs.Phase != PhaseSetup {
		t.Fatalf("expected setup phase, got %s", gs.Phase)
	}
	if gs.StartOrder == nil || gs.StartOrder.Status != StartOrderWaiting {
		t.Fatalf("expected waiting start order, got %#v", gs.StartOrder)
	}
	if _, err := RollStartOrder(gs, "p1", 6, 6); err == nil {
		t.Fatalf("expected roll to be blocked while open slots remain")
	}
}
