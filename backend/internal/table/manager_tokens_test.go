package table

import (
	"testing"

	"gamepolyweb/backend/internal/game"
)

func TestCreateRejectsDuplicateOccupiedTokenModels(t *testing.T) {
	mgr := NewManager(nil)
	_, err := mgr.Create(CreateRequest{
		Slots: []SlotConfig{
			{Name: "Ana", Type: "human", TokenModel: "sombrero.glb"},
			{Name: "Bot", Type: "bot", TokenModel: "sombrero.glb", Difficulty: game.BotRegular},
			{Name: "open", Type: "open"},
		},
		Opts: game.GameOptions{GoSalary: 200, JailBailCost: 50},
	})
	if err == nil {
		t.Fatalf("expected duplicate token error")
	}
}

func TestJoinRejectsTokenModelAlreadyInUse(t *testing.T) {
	mgr := NewManager(nil)
	result, err := mgr.Create(CreateRequest{
		Slots: []SlotConfig{
			{Name: "Ana", Type: "human", TokenModel: "sombrero.glb"},
			{Name: "open", Type: "open"},
		},
		Opts: game.GameOptions{GoSalary: 200, JailBailCost: 50},
	})
	if err != nil {
		t.Fatalf("create table: %v", err)
	}
	defer mgr.Remove(result.TableID)

	if _, err := mgr.Join(result.TableID, "Luis", "sombrero.glb"); err == nil {
		t.Fatalf("expected duplicate token error")
	}
}

func TestJoinAssignsSelectedTokenModel(t *testing.T) {
	mgr := NewManager(nil)
	result, err := mgr.Create(CreateRequest{
		Slots: []SlotConfig{
			{Name: "Ana", Type: "human", TokenModel: "sombrero.glb"},
			{Name: "open", Type: "open"},
		},
		Opts: game.GameOptions{GoSalary: 200, JailBailCost: 50},
	})
	if err != nil {
		t.Fatalf("create table: %v", err)
	}
	defer mgr.Remove(result.TableID)

	joined, err := mgr.Join(result.TableID, "Luis", "dedal.glb")
	if err != nil {
		t.Fatalf("join table: %v", err)
	}
	tbl := mgr.Get(result.TableID)
	player := tbl.State.FindPlayer(joined.PlayerID)
	if player == nil {
		t.Fatalf("expected joined player in state")
	}
	if player.TokenModel != "dedal.glb" {
		t.Fatalf("expected selected token model, got %q", player.TokenModel)
	}
}
