package game

import "gamepolyweb/backend/internal/config"

// CheckBankruptcyPublic is a public wrapper for the internal checkBankruptcy.
func CheckBankruptcyPublic(gs *GameState, playerID string) {
	checkBankruptcy(gs, playerID)
}

// GetOwnableTilePublic exposes config.GetOwnableTile for other packages.
func GetOwnableTilePublic(tileIndex int) *config.BoardTile {
	return config.GetOwnableTile(tileIndex)
}

// ResolveCardTextPublic returns card text with board placeholders replaced.
func ResolveCardTextPublic(card config.GameCard) string {
	return config.ResolveCardText(card)
}

// GetTaxAmount returns the tax amount for a given tile index.
func GetTaxAmount(tileIndex int) int {
	amounts := map[int]int{4: 200, 38: 100}
	return amounts[tileIndex]
}
