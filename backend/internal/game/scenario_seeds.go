package game

import (
	"fmt"

	"gamepolyweb/backend/internal/config"
)

const scenarioSeedCash = 100000

// ApplyScenarioSeeds mirrors the local frontend scenario seeds for multiplayer tables.
func ApplyScenarioSeeds(gs *GameState, seeds []string) []string {
	applied := make([]string, 0, len(seeds))
	for _, seed := range seeds {
		switch seed {
		case "all-properties":
			seedAllPropertiesForActivePlayer(gs, scenarioSeedCash)
		case "all-properties-hotels":
			seedAllPropertiesWithHotelsForActivePlayer(gs, scenarioSeedCash)
		case "all-players-doubles":
			seedAllPlayersRollDoubles(gs)
		case "all-players-in-jail":
			seedAllPlayersInJail(gs)
		case "all-players-land-on-cards":
			seedAllPlayersLandOnCards(gs)
		case "debt-resolution":
			seedDebtResolutionScenario(gs)
		default:
			continue
		}
		applied = append(applied, seed)
	}
	return applied
}

func seedAllPropertiesForActivePlayer(gs *GameState, cash int) {
	player := gs.ActivePlayer()
	if player == nil {
		return
	}
	player.Cash = cash
	for _, tile := range gs.Board.Tiles {
		if tile.Price == nil {
			continue
		}
		gs.PropertyOwners[tile.Index] = player.ID
		if _, ok := gs.PropertyDevelopments[tile.Index]; !ok {
			gs.PropertyDevelopments[tile.Index] = PropertyDevelopment{}
		}
	}
	gs.StatusMessage = fmt.Sprintf("Escenario local activado. %s inicia con todas las propiedades y $%d", player.Name, cash)
}

func seedAllPropertiesWithHotelsForActivePlayer(gs *GameState, cash int) {
	player := gs.ActivePlayer()
	if player == nil {
		return
	}
	player.Cash = cash
	for _, tile := range gs.Board.Tiles {
		if tile.Price == nil {
			continue
		}
		gs.PropertyOwners[tile.Index] = player.ID
		dev := gs.GetDevelopment(tile.Index)
		if tile.Type == config.TileTypeProperty {
			dev.Houses = 0
			dev.Hotel = true
			dev.Mortgaged = false
		}
		gs.SetDevelopment(tile.Index, dev)
	}
	gs.StatusMessage = fmt.Sprintf("Escenario local activado. %s inicia con todas las propiedades, hoteles y $%d", player.Name, cash)
}

func seedAllPlayersRollDoubles(gs *GameState) {
	gs.ForceAllDiceRollsAsDoubles = true
	gs.DiceValues = [2]int{6, 6}
	gs.IsDoubles = true
	gs.StatusMessage = "Escenario local activado. Todos los tiros seran dobles"
}

func seedAllPlayersInJail(gs *GameState) {
	for _, player := range gs.Players {
		player.InJail = true
		player.JailTurns = 0
		player.Position = 10
		player.ConsecutiveDoubles = 0
	}
	gs.IsTurnComplete = false
	gs.StatusMessage = "Escenario local activado. Todos los jugadores inician en la carcel"
}

func seedAllPlayersLandOnCards(gs *GameState) {
	gs.ForceAllDiceRollsToCards = true
	player := gs.ActivePlayer()
	if player != nil {
		d1, d2 := diceValuesForTotal(stepsToNextCardTile(gs, player.Position))
		gs.DiceValues = [2]int{d1, d2}
		gs.IsDoubles = d1 == d2
	}
	gs.StatusMessage = "Escenario local activado. Todos los jugadores caeran en Arca Comunal o Suerte"
}

func seedDebtResolutionScenario(gs *GameState) {
	player := gs.ActivePlayer()
	if player == nil {
		return
	}

	gs.PropertyOwners = map[int]string{}
	gs.PropertyDevelopments = map[int]PropertyDevelopment{}
	gs.BankruptPlayers = []string{}
	gs.ExchangeProposal = nil
	gs.IsAuctionActive = false
	gs.Auction = nil
	gs.ActiveCard = nil
	gs.IsTurnComplete = true

	player.Position = 24
	player.Cash = -260
	player.InJail = false
	player.JailTurns = 0
	player.ConsecutiveDoubles = 0

	for _, tileIndex := range []int{1, 3, 5, 12, 15} {
		gs.PropertyOwners[tileIndex] = player.ID
		gs.SetDevelopment(tileIndex, PropertyDevelopment{})
	}

	for _, tileIndex := range []int{16, 18, 19} {
		gs.PropertyOwners[tileIndex] = player.ID
		gs.SetDevelopment(tileIndex, PropertyDevelopment{Houses: 2})
	}

	for _, tileIndex := range []int{26, 27, 29} {
		gs.PropertyOwners[tileIndex] = player.ID
		gs.SetDevelopment(tileIndex, PropertyDevelopment{Hotel: true})
	}

	for _, opponent := range gs.Players {
		if opponent.ID == player.ID {
			continue
		}
		opponent.Position = 0
		opponent.Cash = 1760
		for _, tileIndex := range []int{21, 23, 24} {
			gs.PropertyOwners[tileIndex] = opponent.ID
			gs.SetDevelopment(tileIndex, PropertyDevelopment{Houses: 3})
		}
		break
	}

	gs.StatusMessage = fmt.Sprintf("Escenario deuda: %s debe $%d. Usa Resolver deuda para vender mejoras o hipotecar", player.Name, -player.Cash)
}
