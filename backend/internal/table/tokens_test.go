package table

import "testing"

func TestNormalizeTokenModel(t *testing.T) {
	if got := normalizeTokenModel("coffee.glb", 2); got != "coffee.glb" {
		t.Fatalf("expected valid token to pass through, got %q", got)
	}

	if got := normalizeTokenModel("", 0); got != "sombrero.glb" {
		t.Fatalf("expected first default token, got %q", got)
	}

	if got := normalizeTokenModel("Player Name", 3); got != "soccer_ball.glb" {
		t.Fatalf("expected slot fallback token, got %q", got)
	}

	if got := normalizeTokenModel("", -1); got != "sombrero.glb" {
		t.Fatalf("expected negative slot fallback token, got %q", got)
	}
}

func TestChooseTokenModelRejectsDuplicate(t *testing.T) {
	used := map[string]bool{"sombrero.glb": true}
	if _, err := chooseTokenModel("sombrero.glb", 0, used); err == nil {
		t.Fatalf("expected duplicate token error")
	}
}

func TestChooseTokenModelRejectsInvalidToken(t *testing.T) {
	if _, err := chooseTokenModel("cat.glb", 0, map[string]bool{}); err == nil {
		t.Fatalf("expected invalid token error")
	}
}

func TestChooseTokenModelFallsBackToUnusedToken(t *testing.T) {
	used := map[string]bool{"sombrero.glb": true}
	got, err := chooseTokenModel("", 0, used)
	if err != nil {
		t.Fatalf("expected fallback token, got error %v", err)
	}
	if got != "dedal.glb" {
		t.Fatalf("expected unused fallback token, got %q", got)
	}
}
