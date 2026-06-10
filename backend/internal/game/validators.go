package game

import (
	"errors"
	"gamepolyweb/backend/internal/config"
)

var (
	ErrNotYourTurn        = errors.New("no es tu turno")
	ErrTurnNotComplete    = errors.New("el turno no esta completo")
	ErrTurnAlreadyDone    = errors.New("ya tiraste los dados este turno")
	ErrInsufficientFunds  = errors.New("fondos insuficientes")
	ErrPropertyOwned      = errors.New("la propiedad ya tiene dueno")
	ErrNotOwner           = errors.New("no eres el dueno")
	ErrAlreadyMortgaged   = errors.New("propiedad ya hipotecada")
	ErrNotMortgaged       = errors.New("propiedad no hipotecada")
	ErrHasImprovements    = errors.New("la propiedad tiene mejoras")
	ErrNotFullGroup       = errors.New("no posees el grupo completo")
	ErrMaxHouses          = errors.New("casas al maximo")
	ErrAlreadyHotel       = errors.New("ya tiene hotel")
	ErrNeedsFullHouses    = errors.New("necesita 4 casas antes del hotel")
	ErrNoImprovements     = errors.New("no hay mejoras que vender")
	ErrBuildingNotEven    = errors.New("debes construir uniformemente")
	ErrNoAuction          = errors.New("no hay subasta activa")
	ErrNotAuctionTurn     = errors.New("no es tu turno en la subasta")
	ErrBidTooLow          = errors.New("oferta demasiado baja")
	ErrNotInJail          = errors.New("no estas en la carcel")
	ErrGameOver           = errors.New("partida terminada")
)

// CanRollDice checks if the active player can roll.
func CanRollDice(gs *GameState, playerID string) error {
	p := gs.ActivePlayer()
	if p == nil {
		return ErrGameOver
	}
	if p.ID != playerID {
		return ErrNotYourTurn
	}
	if gs.IsTurnComplete {
		return ErrTurnAlreadyDone
	}
	return nil
}

// CanBuyProperty checks if playerID can buy tileIndex.
func CanBuyProperty(gs *GameState, playerID string, tileIndex int) error {
	p := gs.ActivePlayer()
	if p == nil || p.ID != playerID {
		return ErrNotYourTurn
	}
	tile := config.GetOwnableTile(tileIndex)
	if tile == nil {
		return errors.New("casilla no comprable")
	}
	if _, owned := gs.PropertyOwners[tileIndex]; owned {
		return ErrPropertyOwned
	}
	player := gs.FindPlayer(playerID)
	if player == nil {
		return errors.New("jugador no encontrado")
	}
	if player.Cash < *tile.Price {
		return ErrInsufficientFunds
	}
	return nil
}

// CanNextTurn checks if playerID can advance to next turn.
func CanNextTurn(gs *GameState, playerID string) error {
	p := gs.ActivePlayer()
	if p == nil || p.ID != playerID {
		return ErrNotYourTurn
	}
	if !gs.IsTurnComplete {
		return ErrTurnNotComplete
	}
	player := gs.FindPlayer(playerID)
	if player != nil && player.Cash < 0 {
		return errors.New("resuelve tu deuda antes de continuar")
	}
	return nil
}

// CanPayBail checks if player can pay jail bail.
func CanPayBail(gs *GameState, playerID string) error {
	player := gs.FindPlayer(playerID)
	if player == nil {
		return errors.New("jugador no encontrado")
	}
	if !player.InJail {
		return ErrNotInJail
	}
	if player.Cash < gs.JailBailCost {
		return ErrInsufficientFunds
	}
	return nil
}

// CanPlaceBid checks if playerID can place a bid.
func CanPlaceBid(gs *GameState, playerID string, increment int) error {
	if !gs.IsAuctionActive || gs.Auction == nil {
		return ErrNoAuction
	}
	if gs.Auction.BidderIdx >= len(gs.Auction.ActiveBidders) {
		return ErrNoAuction
	}
	currentBidder := gs.Auction.ActiveBidders[gs.Auction.BidderIdx]
	if currentBidder != playerID {
		return ErrNotAuctionTurn
	}
	player := gs.FindPlayer(playerID)
	if player == nil {
		return errors.New("jugador no encontrado")
	}
	newBid := gs.Auction.CurrentBid + increment
	if newBid <= gs.Auction.CurrentBid {
		return ErrBidTooLow
	}
	if player.Cash < newBid {
		return ErrInsufficientFunds
	}
	return nil
}

// CanPassBid checks if player can pass in the auction.
func CanPassBid(gs *GameState, playerID string) error {
	if !gs.IsAuctionActive || gs.Auction == nil {
		return ErrNoAuction
	}
	if gs.Auction.BidderIdx >= len(gs.Auction.ActiveBidders) {
		return ErrNoAuction
	}
	if gs.Auction.ActiveBidders[gs.Auction.BidderIdx] != playerID {
		return ErrNotAuctionTurn
	}
	return nil
}

// CanBuildHouse checks all rules for building a house.
func CanBuildHouse(gs *GameState, playerID string, tileIndex int) error {
	tile := config.GetTile(tileIndex)
	if tile == nil || tile.Type != config.TileTypeProperty {
		return errors.New("casilla invalida")
	}
	if gs.PropertyOwners[tileIndex] != playerID {
		return ErrNotOwner
	}
	if !ownsFullPropertyGroup(gs, playerID, tileIndex) {
		return ErrNotFullGroup
	}
	if hasMortgagedInGroup(gs, tileIndex) {
		return errors.New("hay propiedades hipotecadas en el grupo")
	}
	dev := gs.GetDevelopment(tileIndex)
	if dev.Mortgaged {
		return ErrAlreadyMortgaged
	}
	if dev.Hotel {
		return ErrAlreadyHotel
	}
	if dev.Houses >= 4 {
		return ErrMaxHouses
	}

	// Even building rule
	nextLevel := dev.Houses + 1
	groupTiles := config.GetGroupTiles(tile.Group, config.TileTypeProperty)
	for _, gt := range groupTiles {
		if gt.Index == tileIndex {
			continue
		}
		gDev := gs.GetDevelopment(gt.Index)
		gLevel := devLevel(gDev)
		if gLevel < nextLevel-1 {
			return ErrBuildingNotEven
		}
	}

	player := gs.FindPlayer(playerID)
	if player == nil {
		return errors.New("jugador no encontrado")
	}
	if tile.Price == nil {
		return errors.New("casilla sin precio")
	}
	cost := config.HouseCostForPrice(*tile.Price)
	if player.Cash < cost {
		return ErrInsufficientFunds
	}
	return nil
}

// CanBuildHotel checks all rules for building a hotel.
func CanBuildHotel(gs *GameState, playerID string, tileIndex int) error {
	tile := config.GetTile(tileIndex)
	if tile == nil || tile.Type != config.TileTypeProperty {
		return errors.New("casilla invalida")
	}
	if gs.PropertyOwners[tileIndex] != playerID {
		return ErrNotOwner
	}
	if !ownsFullPropertyGroup(gs, playerID, tileIndex) {
		return ErrNotFullGroup
	}
	if hasMortgagedInGroup(gs, tileIndex) {
		return errors.New("hay propiedades hipotecadas en el grupo")
	}
	dev := gs.GetDevelopment(tileIndex)
	if dev.Mortgaged {
		return ErrAlreadyMortgaged
	}
	if dev.Hotel {
		return ErrAlreadyHotel
	}
	if dev.Houses < 4 {
		return ErrNeedsFullHouses
	}

	groupTiles := config.GetGroupTiles(tile.Group, config.TileTypeProperty)
	for _, gt := range groupTiles {
		if gt.Index == tileIndex {
			continue
		}
		gDev := gs.GetDevelopment(gt.Index)
		if !gDev.Hotel && gDev.Houses < 4 {
			return ErrBuildingNotEven
		}
	}

	player := gs.FindPlayer(playerID)
	if player == nil {
		return errors.New("jugador no encontrado")
	}
	if tile.Price == nil {
		return errors.New("casilla sin precio")
	}
	cost := config.HotelCostForPrice(*tile.Price)
	if player.Cash < cost {
		return ErrInsufficientFunds
	}
	return nil
}

// CanSellImprovement checks rules for selling a house/hotel.
func CanSellImprovement(gs *GameState, playerID string, tileIndex int) error {
	if gs.PropertyOwners[tileIndex] != playerID {
		return ErrNotOwner
	}
	tile := config.GetTile(tileIndex)
	if tile == nil || tile.Type != config.TileTypeProperty {
		return errors.New("casilla invalida")
	}
	dev := gs.GetDevelopment(tileIndex)
	if !dev.Hotel && dev.Houses <= 0 {
		return ErrNoImprovements
	}

	currentLevel := devLevel(dev)
	nextLevel := currentLevel - 1
	if dev.Hotel {
		nextLevel = 4
	}
	groupTiles := config.GetGroupTiles(tile.Group, config.TileTypeProperty)
	for _, gt := range groupTiles {
		if gt.Index == tileIndex {
			continue
		}
		gDev := gs.GetDevelopment(gt.Index)
		gLevel := devLevel(gDev)
		if gLevel > currentLevel || gLevel > nextLevel+1 {
			return ErrBuildingNotEven
		}
	}
	return nil
}

// CanMortgage checks if a property can be mortgaged.
func CanMortgage(gs *GameState, playerID string, tileIndex int) error {
	tile := config.GetOwnableTile(tileIndex)
	if tile == nil {
		return errors.New("casilla no hipotecable")
	}
	if gs.PropertyOwners[tileIndex] != playerID {
		return ErrNotOwner
	}
	dev := gs.GetDevelopment(tileIndex)
	if dev.Mortgaged {
		return ErrAlreadyMortgaged
	}
	if tile.Type == config.TileTypeProperty && hasImprovementInGroup(gs, tileIndex) {
		return ErrHasImprovements
	}
	return nil
}

// CanUnmortgage checks if a property can be unmortgaged.
func CanUnmortgage(gs *GameState, playerID string, tileIndex int) error {
	tile := config.GetOwnableTile(tileIndex)
	if tile == nil {
		return errors.New("casilla invalida")
	}
	if gs.PropertyOwners[tileIndex] != playerID {
		return ErrNotOwner
	}
	dev := gs.GetDevelopment(tileIndex)
	if !dev.Mortgaged {
		return ErrNotMortgaged
	}
	player := gs.FindPlayer(playerID)
	if player == nil {
		return errors.New("jugador no encontrado")
	}
	cost := config.UnmortgageCostForPrice(*tile.Price)
	if player.Cash < cost {
		return ErrInsufficientFunds
	}
	return nil
}

// CanProposeExchange basic validation.
func CanProposeExchange(gs *GameState, playerID string, proposal ExchangeProposal) error {
	if gs.ExchangeProposal != nil {
		return errors.New("ya hay una propuesta activa")
	}
	if proposal.FromPlayerID != playerID {
		return errors.New("la propuesta debe ser tuya")
	}
	player := gs.FindPlayer(playerID)
	if player == nil {
		return errors.New("jugador no encontrado")
	}
	if player.Cash < proposal.OfferMoney {
		return ErrInsufficientFunds
	}
	for _, idx := range proposal.OfferProperties {
		if gs.PropertyOwners[idx] != playerID {
			return ErrNotOwner
		}
	}
	return nil
}

// helpers

func ownsFullPropertyGroup(gs *GameState, playerID string, tileIndex int) bool {
	tile := config.GetTile(tileIndex)
	if tile == nil || tile.Type != config.TileTypeProperty {
		return false
	}
	groupTiles := config.GetGroupTiles(tile.Group, config.TileTypeProperty)
	if len(groupTiles) == 0 {
		return false
	}
	for _, gt := range groupTiles {
		if gs.PropertyOwners[gt.Index] != playerID {
			return false
		}
	}
	return true
}

func hasMortgagedInGroup(gs *GameState, tileIndex int) bool {
	tile := config.GetTile(tileIndex)
	if tile == nil || tile.Type != config.TileTypeProperty {
		return false
	}
	for _, gt := range config.GetGroupTiles(tile.Group, config.TileTypeProperty) {
		if gs.GetDevelopment(gt.Index).Mortgaged {
			return true
		}
	}
	return false
}

func hasImprovementInGroup(gs *GameState, tileIndex int) bool {
	tile := config.GetTile(tileIndex)
	if tile == nil || tile.Type != config.TileTypeProperty {
		return false
	}
	for _, gt := range config.GetGroupTiles(tile.Group, config.TileTypeProperty) {
		d := gs.GetDevelopment(gt.Index)
		if d.Hotel || d.Houses > 0 {
			return true
		}
	}
	return false
}

func devLevel(d PropertyDevelopment) int {
	if d.Hotel {
		return 5
	}
	return d.Houses
}
