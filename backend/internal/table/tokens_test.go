package table

import "testing"

func TestNormalizeTokenModel(t *testing.T) {
	if got := normalizeTokenModel("cat.glb", 2); got != "cat.glb" {
		t.Fatalf("expected valid token to pass through, got %q", got)
	}

	if got := normalizeTokenModel("", 0); got != "sombrero.glb" {
		t.Fatalf("expected first default token, got %q", got)
	}

	if got := normalizeTokenModel("Player Name", 3); got != "cat.glb" {
		t.Fatalf("expected slot fallback token, got %q", got)
	}

	if got := normalizeTokenModel("", -1); got != "sombrero.glb" {
		t.Fatalf("expected negative slot fallback token, got %q", got)
	}
}
