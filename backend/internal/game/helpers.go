package game

import "gamepolyweb/backend/internal/config"

// CheckBankruptcyPublic is a public wrapper for the internal checkBankruptcy.
func CheckBankruptcyPublic(gs *GameState, playerID string) {
	checkBankruptcy(gs, playerID)
}

// GetOwnableTilePublic returns the ownable tile at tileIndex using the board
// config loaded in gs. Returns nil if the tile has no price.
func GetOwnableTilePublic(gs *GameState, tileIndex int) *config.BoardTile {
	return gs.Board.GetOwnableTile(tileIndex)
}

// ResolveCardTextPublic returns card text with {tileName} placeholders replaced
// using the board config loaded in gs.
func ResolveCardTextPublic(gs *GameState, card config.GameCard) string {
	return gs.Board.ResolveCardText(card)
}

// GetTaxAmount returns the tax amount for a given tile index.
func GetTaxAmount(tileIndex int) int {
	amounts := map[int]int{4: 200, 38: 100}
	return amounts[tileIndex]
}
