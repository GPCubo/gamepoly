package game

import (
	"fmt"
	"math/rand"
	"time"

	"gamepolyweb/backend/internal/config"
)

// RollDice generates two random dice values and updates state.
// Returns the total and whether doubles were rolled.
func RollDice(gs *GameState) (d1, d2 int, isDoubles bool) {
	if gs.ForceAllDiceRollsToCards {
		p := gs.ActivePlayer()
		steps := 2
		if p != nil {
			steps = stepsToNextCardTile(p.Position)
		}
		d1, d2 = diceValuesForTotal(steps)
		isDoubles = d1 == d2
		gs.DiceValues = [2]int{d1, d2}
		gs.IsDoubles = isDoubles
		return
	}

	if gs.ForceAllDiceRollsAsDoubles {
		d1, d2 = 6, 6
		isDoubles = true
		gs.DiceValues = [2]int{d1, d2}
		gs.IsDoubles = true
		return
	}

	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	d1 = r.Intn(6) + 1
	d2 = r.Intn(6) + 1
	isDoubles = d1 == d2
	gs.DiceValues = [2]int{d1, d2}
	gs.IsDoubles = isDoubles
	return
}

func stepsToNextCardTile(position int) int {
	current := ((position % 40) + 40) % 40
	best := 40
	for _, tile := range config.BoardTiles {
		if tile.Type != config.TileTypeCard {
			continue
		}
		steps := tile.Index - current
		if steps <= 0 {
			steps += 40
		}
		if steps < best {
			best = steps
		}
	}
	return best
}

func diceValuesForTotal(total int) (int, int) {
	pairs := map[int][2]int{
		2:  {1, 1},
		3:  {1, 2},
		4:  {1, 3},
		5:  {2, 3},
		6:  {1, 5},
		7:  {3, 4},
		8:  {3, 5},
		9:  {4, 5},
		10: {4, 6},
		11: {5, 6},
		12: {6, 6},
	}
	if pair, ok := pairs[total]; ok {
		return pair[0], pair[1]
	}
	return 1, 1
}

// MoveResult holds the outcome of moving a player.
type MoveResult struct {
	PlayerID    string
	From        int
	To          int
	Path        []int
	PassedGo    bool
	GoSalary    int
}

// MovePlayer moves the active player by `steps` tiles.
// Returns the path of positions visited (for animation) and whether GO was crossed.
func MovePlayer(gs *GameState, steps int) MoveResult {
	p := gs.ActivePlayer()
	if p == nil {
		return MoveResult{}
	}
	from := p.Position % 40
	target := p.Position + steps
	normalizedTarget := ((target % 40) + 40) % 40

	passedGo := (target/40) > (p.Position/40)

	// Build animation path
	path := make([]int, 0, steps)
	for i := p.Position + 1; i <= target; i++ {
		path = append(path, ((i%40)+40)%40)
	}

	if passedGo {
		p.Cash += gs.GoSalary
		gs.StatusMessage = fmt.Sprintf("¡%s pasó por la Salida y cobró $%d!", p.Name, gs.GoSalary)
	}

	p.Position = target
	p.InJail = false
	p.JailTurns = 0
	gs.IsTurnComplete = true

	return MoveResult{
		PlayerID: p.ID,
		From:     from,
		To:       normalizedTarget,
		Path:     path,
		PassedGo: passedGo,
		GoSalary: gs.GoSalary,
	}
}

type DoublesResult int

const (
	DoublesNone  DoublesResult = iota
	DoublesExtra
	DoublesJail
)

func CheckDoubles(gs *GameState) DoublesResult {
	if !gs.IsDoubles || !gs.DoublesGiveExtra {
		p := gs.ActivePlayer()
		if p != nil {
			p.ConsecutiveDoubles = 0
		}
		return DoublesNone
	}
	p := gs.ActivePlayer()
	if p == nil {
		return DoublesNone
	}
	p.ConsecutiveDoubles++
	if p.ConsecutiveDoubles >= 3 {
		SendToJail(gs, p.ID)
		return DoublesJail
	}
	return DoublesExtra
}

// SendToJail sends a player to jail.
func SendToJail(gs *GameState, playerID string) {
	p := gs.FindPlayer(playerID)
	if p == nil {
		return
	}
	p.InJail = true
	p.JailTurns = 0
	p.Position = 10
	p.ConsecutiveDoubles = 0
	gs.StatusMessage = fmt.Sprintf("¡%s va a la cárcel!", p.Name)
}

// PayBail removes player from jail in exchange for bail cost.
func PayBail(gs *GameState, playerID string) {
	p := gs.FindPlayer(playerID)
	if p == nil || !p.InJail {
		return
	}
	p.Cash -= gs.JailBailCost
	p.InJail = false
	p.JailTurns = 0
	gs.StatusMessage = fmt.Sprintf("%s pagó $%d de fianza y sale de la cárcel", p.Name, gs.JailBailCost)
	checkBankruptcy(gs, playerID)
}

// RollFromJail attempts to roll doubles to get out of jail.
// Returns "freed", "stayed", or "forced_free".
func RollFromJail(gs *GameState) string {
	p := gs.ActivePlayer()
	if p == nil || !p.InJail {
		return "freed"
	}
	if gs.IsDoubles {
		p.InJail = false
		p.JailTurns = 0
		gs.StatusMessage = fmt.Sprintf("¡%s sacó dobles y sale de la cárcel!", p.Name)
		return "freed"
	}
	p.JailTurns++
	if p.JailTurns >= 3 {
		p.Cash -= gs.JailBailCost
		p.InJail = false
		p.JailTurns = 0
		gs.StatusMessage = fmt.Sprintf("%s cumplió 3 turnos, sale pagando $%d", p.Name, gs.JailBailCost)
		checkBankruptcy(gs, p.ID)
		return "forced_free"
	}
	gs.StatusMessage = fmt.Sprintf("%s no sacó dobles. Turno en cárcel (%d/3)", p.Name, p.JailTurns)
	return "stayed"
}

// BuyProperty executes a property purchase.
func BuyProperty(gs *GameState, playerID string, tileIndex int) {
	tile := config.GetOwnableTile(tileIndex)
	p := gs.FindPlayer(playerID)
	if tile == nil || p == nil {
		return
	}
	p.Cash -= *tile.Price
	gs.PropertyOwners[tileIndex] = playerID
	if _, ok := gs.PropertyDevelopments[tileIndex]; !ok {
		gs.PropertyDevelopments[tileIndex] = PropertyDevelopment{}
	}
	gs.StatusMessage = fmt.Sprintf("%s compró %s por $%d", p.Name, tile.Name, *tile.Price)
	gs.AddHistory(EconomicHistoryItem{
		Type:      HistPurchase,
		Title:     fmt.Sprintf("%s compró %s", p.Name, tile.Name),
		Detail:    fmt.Sprintf("%s pagó $%d por %s. Saldo: $%d", p.Name, *tile.Price, tile.Name, p.Cash),
		Amount:    tile.Price,
		PlayerIDs: []string{playerID},
	})
	checkBankruptcy(gs, playerID)
}

// BuyAuctionedProperty finalizes an auction purchase.
func BuyAuctionedProperty(gs *GameState, playerID string, tileIndex, amount int) {
	tile := config.GetOwnableTile(tileIndex)
	p := gs.FindPlayer(playerID)
	if tile == nil || p == nil {
		return
	}
	p.Cash -= amount
	gs.PropertyOwners[tileIndex] = playerID
	if _, ok := gs.PropertyDevelopments[tileIndex]; !ok {
		gs.PropertyDevelopments[tileIndex] = PropertyDevelopment{}
	}
	gs.StatusMessage = fmt.Sprintf("%s ganó la subasta de %s por $%d", p.Name, tile.Name, amount)
	amountCopy := amount
	gs.AddHistory(EconomicHistoryItem{
		Type:      HistAuction,
		Title:     fmt.Sprintf("%s ganó una subasta", p.Name),
		Detail:    fmt.Sprintf("%s compró %s en subasta por $%d. Saldo: $%d", p.Name, tile.Name, amount, p.Cash),
		Amount:    &amountCopy,
		PlayerIDs: []string{playerID},
	})
	checkBankruptcy(gs, playerID)
}

// CollectRent deducts rent from the payer and adds to the owner.
func CollectRent(gs *GameState, fromID, toID string, tileIndex, diceTotal int) int {
	tile := config.GetOwnableTile(tileIndex)
	if tile == nil {
		return 0
	}
	payer := gs.FindPlayer(fromID)
	owner := gs.FindPlayer(toID)
	if payer == nil || owner == nil {
		return 0
	}

	rent := CalculateRent(gs, tileIndex, toID, diceTotal)
	if rent <= 0 {
		return 0
	}

	payer.Cash -= rent
	owner.Cash += rent
	gs.StatusMessage = fmt.Sprintf("%s pagó $%d de renta a %s por %s", payer.Name, rent, owner.Name, tile.Name)
	gs.AddHistory(EconomicHistoryItem{
		Type:      HistRent,
		Title:     fmt.Sprintf("%s pagó renta a %s", payer.Name, owner.Name),
		Detail:    fmt.Sprintf("Renta de %s: $%d", tile.Name, rent),
		Amount:    &rent,
		PlayerIDs: []string{fromID, toID},
	})
	checkBankruptcy(gs, fromID)
	return rent
}

// CalculateRent computes the rent for landing on a property.
func CalculateRent(gs *GameState, tileIndex int, ownerID string, diceTotal int) int {
	tile := config.GetOwnableTile(tileIndex)
	if tile == nil {
		return 0
	}
	dev := gs.GetDevelopment(tileIndex)
	if dev.Mortgaged {
		return 0
	}

	switch tile.Type {
	case config.TileTypeProperty:
		price := *tile.Price
		if dev.Hotel || dev.Houses > 0 {
			return config.RentForDevelopment(price, dev.Houses, dev.Hotel)
		}
		// Base rent — doubled if owns full group
		base := config.RentBaseForPrice(price)
		if ownsFullPropertyGroup(gs, ownerID, tileIndex) {
			return base * 2
		}
		return base

	case config.TileTypeRailroad:
		count := 0
		for _, t := range config.BoardTiles {
			if t.Type == config.TileTypeRailroad && gs.PropertyOwners[t.Index] == ownerID {
				count++
			}
		}
		return config.RailroadRent(count)

	case config.TileTypeUtility:
		count := 0
		for _, t := range config.BoardTiles {
			if t.Type == config.TileTypeUtility && gs.PropertyOwners[t.Index] == ownerID {
				count++
			}
		}
		return config.UtilityRent(count, diceTotal)
	}
	return 0
}

// PayTax deducts a tax from the player.
func PayTax(gs *GameState, playerID string, tileIndex int) int {
	p := gs.FindPlayer(playerID)
	if p == nil {
		return 0
	}
	amounts := map[int]int{4: 200, 38: 100}
	amount, ok := amounts[tileIndex]
	if !ok {
		return 0
	}
	p.Cash -= amount
	tile := config.GetTile(tileIndex)
	name := "impuesto"
	if tile != nil {
		name = tile.Name
	}
	gs.StatusMessage = fmt.Sprintf("%s pagó $%d de %s", p.Name, amount, name)
	gs.AddHistory(EconomicHistoryItem{
		Type:      HistTax,
		Title:     fmt.Sprintf("%s pagó %s", p.Name, name),
		Detail:    fmt.Sprintf("$%d", amount),
		Amount:    &amount,
		PlayerIDs: []string{playerID},
	})
	checkBankruptcy(gs, playerID)
	return amount
}

// DrawCard pops the top card from the appropriate deck.
func DrawCard(gs *GameState, group string) *config.GameCard {
	var deck *[]int
	var cards []config.GameCard
	if group == "chance" {
		deck = &gs.ChanceDeck
		cards = config.ChanceCards
	} else {
		deck = &gs.CommunityDeck
		cards = config.CommunityCards
	}
	if len(*deck) == 0 {
		newDeck := config.ShuffleDeck(len(cards))
		*deck = newDeck
	}
	idx := (*deck)[0]
	*deck = (*deck)[1:]
	card := cards[idx]
	gs.ActiveCard = &card
	return &card
}

// ApplyCardEffect applies the active card's effect and returns events.
type CardResult struct {
	Card     config.GameCard
	PlayerID string
	Moved    bool
	PrevPos  int
	NewPos   int
	Path     []int
	Amount   int
	Jailed   bool
	PassedGo bool
}

func ApplyCardEffect(gs *GameState, playerID string, diceTotal int) CardResult {
	if gs.ActiveCard == nil {
		return CardResult{}
	}
	card := *gs.ActiveCard
	gs.ActiveCard = nil
	p := gs.FindPlayer(playerID)
	if p == nil {
		return CardResult{Card: card}
	}

	prevPos := ((p.Position % 40) + 40) % 40
	result := CardResult{Card: card, PlayerID: playerID, PrevPos: prevPos}

	switch card.Action {
	case config.CardCollect:
		if card.Amount != nil {
			amount := *card.Amount
			p.Cash += amount
			result.Amount = amount
			gs.AddHistory(EconomicHistoryItem{
				Type:      HistCardGain,
				Title:     fmt.Sprintf("%s cobró $%d", p.Name, amount),
				Detail:    card.Text,
				Amount:    &amount,
				PlayerIDs: []string{playerID},
			})
		}
	case config.CardPay:
		if card.Amount != nil {
			amount := *card.Amount
			p.Cash -= amount
			result.Amount = amount
			gs.AddHistory(EconomicHistoryItem{
				Type:      HistCardLoss,
				Title:     fmt.Sprintf("%s pagó $%d", p.Name, amount),
				Detail:    card.Text,
				Amount:    &amount,
				PlayerIDs: []string{playerID},
			})
			checkBankruptcy(gs, playerID)
		}
	case config.CardPayEach:
		if card.Amount != nil {
			amount := *card.Amount
			for _, other := range gs.ActivePlayers() {
				if other.ID == playerID {
					continue
				}
				p.Cash -= amount
				other.Cash += amount
			}
			result.Amount = amount
		}
	case config.CardMoveTo:
		if card.TileIndex != nil {
			target := *card.TileIndex
			// Check if card says "collect $200" (tile 0 = GO)
			collectGo := target == 0
			from := p.Position % 40
			if collectGo && from > 0 {
				p.Cash += gs.GoSalary
				result.PassedGo = true
			}
			path := movePath(p.Position, target)
			p.Position = target
			p.InJail = false
			p.JailTurns = 0
			result.Moved = true
			result.NewPos = target
			result.Path = path
			gs.IsTurnComplete = true
		}
	case config.CardMoveSteps:
		if card.Amount != nil {
			steps := *card.Amount
			target := ((p.Position+steps)%40 + 40) % 40
			path := movePath(p.Position%40, target)
			p.Position = p.Position + steps
			p.InJail = false
			result.Moved = true
			result.NewPos = target
			result.Path = path
			gs.IsTurnComplete = true
		}
	case config.CardGoToJail:
		SendToJail(gs, playerID)
		result.Jailed = true
		gs.IsTurnComplete = true
	}

	return result
}

// FinishTurn advances to the next non-bankrupt player.
func FinishTurn(gs *GameState) {
	gs.IsTurnComplete = false
	gs.IsDoubles = false
	current := gs.ActivePlayer()
	if current != nil {
		current.ConsecutiveDoubles = 0
	}
	total := len(gs.Players)
	next := (gs.ActivePlayerIndex + 1) % total
	guard := 0
	for gs.IsBankrupt(gs.Players[next].ID) && guard < total {
		next = (next + 1) % total
		guard++
	}
	gs.ActivePlayerIndex = next
	nextPlayer := gs.Players[next]
	gs.StatusMessage = fmt.Sprintf("¡Turno de %s!", nextPlayer.Name)
}

// FinishTurnKeepPlayer keeps the same player (after doubles).
func FinishTurnKeepPlayer(gs *GameState) {
	gs.IsTurnComplete = false
	gs.IsDoubles = false
	p := gs.ActivePlayer()
	if p != nil {
		gs.StatusMessage = fmt.Sprintf("¡%s sacó dobles, tira de nuevo!", p.Name)
	}
}

// BuildHouse builds a house on a property.
func BuildHouse(gs *GameState, playerID string, tileIndex int) {
	tile := config.GetTile(tileIndex)
	p := gs.FindPlayer(playerID)
	if tile == nil || p == nil || tile.Price == nil {
		return
	}
	cost := config.HouseCostForPrice(*tile.Price)
	d := gs.GetDevelopment(tileIndex)
	p.Cash -= cost
	d.Houses = min4(d.Houses+1, 4)
	d.Hotel = false
	gs.SetDevelopment(tileIndex, d)
	gs.StatusMessage = fmt.Sprintf("%s construyó una casa en %s por $%d", p.Name, tile.Name, cost)
}

// BuildHotel builds a hotel on a property.
func BuildHotel(gs *GameState, playerID string, tileIndex int) {
	tile := config.GetTile(tileIndex)
	p := gs.FindPlayer(playerID)
	if tile == nil || p == nil || tile.Price == nil {
		return
	}
	cost := config.HotelCostForPrice(*tile.Price)
	d := gs.GetDevelopment(tileIndex)
	p.Cash -= cost
	d.Houses = 0
	d.Hotel = true
	gs.SetDevelopment(tileIndex, d)
	gs.StatusMessage = fmt.Sprintf("%s amplió %s a hotel por $%d", p.Name, tile.Name, cost)
}

// SellImprovement sells a house or hotel.
func SellImprovement(gs *GameState, playerID string, tileIndex int) {
	tile := config.GetTile(tileIndex)
	p := gs.FindPlayer(playerID)
	if tile == nil || p == nil || tile.Price == nil {
		return
	}
	d := gs.GetDevelopment(tileIndex)
	if d.Hotel {
		refund := config.HotelCostForPrice(*tile.Price) / 2
		d.Hotel = false
		d.Houses = 4
		p.Cash += refund
		gs.StatusMessage = fmt.Sprintf("%s vendió el hotel de %s por $%d", p.Name, tile.Name, refund)
	} else if d.Houses > 0 {
		refund := config.HouseCostForPrice(*tile.Price) / 2
		d.Houses = max0(d.Houses-1, 0)
		p.Cash += refund
		gs.StatusMessage = fmt.Sprintf("%s vendió una casa de %s por $%d", p.Name, tile.Name, refund)
	}
	gs.SetDevelopment(tileIndex, d)
}

// MortgageProperty mortgages a property.
func MortgageProperty(gs *GameState, playerID string, tileIndex int) {
	tile := config.GetOwnableTile(tileIndex)
	p := gs.FindPlayer(playerID)
	if tile == nil || p == nil {
		return
	}
	value := config.MortgageValueForPrice(*tile.Price)
	d := gs.GetDevelopment(tileIndex)
	d.Mortgaged = true
	gs.SetDevelopment(tileIndex, d)
	p.Cash += value
	gs.StatusMessage = fmt.Sprintf("%s hipotecó %s, recibió $%d", p.Name, tile.Name, value)
	gs.AddHistory(EconomicHistoryItem{
		Type:      HistMortgage,
		Title:     fmt.Sprintf("%s hipotecó %s", p.Name, tile.Name),
		Detail:    fmt.Sprintf("Valor hipoteca: $%d", value),
		Amount:    &value,
		PlayerIDs: []string{playerID},
	})
}

// UnmortgageProperty lifts a mortgage.
func UnmortgageProperty(gs *GameState, playerID string, tileIndex int) {
	tile := config.GetOwnableTile(tileIndex)
	p := gs.FindPlayer(playerID)
	if tile == nil || p == nil {
		return
	}
	cost := config.UnmortgageCostForPrice(*tile.Price)
	d := gs.GetDevelopment(tileIndex)
	d.Mortgaged = false
	gs.SetDevelopment(tileIndex, d)
	p.Cash -= cost
	gs.StatusMessage = fmt.Sprintf("%s levantó la hipoteca de %s por $%d", p.Name, tile.Name, cost)
}

// DeclareBankruptcy removes a player from the game.
func DeclareBankruptcy(gs *GameState, playerID string) {
	if gs.IsBankrupt(playerID) {
		return
	}
	p := gs.FindPlayer(playerID)
	// Return all properties
	for idx, owner := range gs.PropertyOwners {
		if owner == playerID {
			delete(gs.PropertyOwners, idx)
			delete(gs.PropertyDevelopments, idx)
		}
	}
	gs.BankruptPlayers = append(gs.BankruptPlayers, playerID)
	if p != nil {
		gs.StatusMessage = fmt.Sprintf("¡%s ha quebrado!", p.Name)
	}
}

// StartAuction initializes auction state for a property.
func StartAuction(gs *GameState, tileIndex, startingBidderIdx int) {
	activePlayers := gs.ActivePlayers()
	bidders := make([]string, len(activePlayers))
	for i, p := range activePlayers {
		bidders[i] = p.ID
	}
	if startingBidderIdx >= len(bidders) {
		startingBidderIdx = 0
	}
	gs.IsAuctionActive = true
	gs.Auction = &AuctionState{
		TileIndex:     tileIndex,
		CurrentBid:    0,
		LeaderID:      "",
		ActiveBidders: bidders,
		BidderIdx:     startingBidderIdx,
	}
	tile := config.GetTile(tileIndex)
	name := "propiedad"
	if tile != nil {
		name = tile.Name
	}
	gs.StatusMessage = fmt.Sprintf("¡Subasta de %s! %s comienza.", name, gs.Auction.ActiveBidders[startingBidderIdx])
}

// PlaceBid places a bid in the current auction.
// Returns true if auction ended.
func PlaceBid(gs *GameState, playerID string, increment int) (ended bool) {
	if gs.Auction == nil {
		return false
	}
	gs.Auction.CurrentBid += increment
	gs.Auction.LeaderID = playerID
	if len(gs.Auction.ActiveBidders) == 1 {
		endAuction(gs)
		return true
	}
	advanceAuctionTurn(gs)
	return checkAuctionEnd(gs)
}

// PassBid removes the current bidder from the auction.
// Returns true if auction ended.
func PassBid(gs *GameState, playerID string) bool {
	if gs.Auction == nil {
		return false
	}
	idx := gs.Auction.BidderIdx
	gs.Auction.ActiveBidders = append(gs.Auction.ActiveBidders[:idx], gs.Auction.ActiveBidders[idx+1:]...)
	if idx >= len(gs.Auction.ActiveBidders) {
		gs.Auction.BidderIdx = 0
	}
	return checkAuctionEnd(gs)
}

func advanceAuctionTurn(gs *GameState) {
	if len(gs.Auction.ActiveBidders) == 0 {
		return
	}
	gs.Auction.BidderIdx = (gs.Auction.BidderIdx + 1) % len(gs.Auction.ActiveBidders)
}

func checkAuctionEnd(gs *GameState) bool {
	if len(gs.Auction.ActiveBidders) == 0 {
		endAuction(gs)
		return true
	}
	if len(gs.Auction.ActiveBidders) == 1 && gs.Auction.ActiveBidders[0] == gs.Auction.LeaderID {
		endAuction(gs)
		return true
	}
	return false
}

func endAuction(gs *GameState) {
	if gs.Auction == nil {
		return
	}
	if gs.Auction.LeaderID != "" && gs.Auction.CurrentBid > 0 {
		BuyAuctionedProperty(gs, gs.Auction.LeaderID, gs.Auction.TileIndex, gs.Auction.CurrentBid)
	}
	gs.IsAuctionActive = false
	gs.Auction = nil
}

// ExecuteExchange executes an accepted trade proposal.
func ExecuteExchange(gs *GameState) {
	if gs.ExchangeProposal == nil {
		return
	}
	p := gs.ExchangeProposal
	from := gs.FindPlayer(p.FromPlayerID)
	to := gs.FindPlayer(p.ToPlayerID)
	if from == nil || to == nil {
		gs.ExchangeProposal = nil
		return
	}
	from.Cash -= p.OfferMoney
	from.Cash += p.RequestMoney
	to.Cash += p.OfferMoney
	to.Cash -= p.RequestMoney
	for _, idx := range p.OfferProperties {
		gs.PropertyOwners[idx] = p.ToPlayerID
	}
	for _, idx := range p.RequestProperties {
		gs.PropertyOwners[idx] = p.FromPlayerID
	}
	gs.StatusMessage = fmt.Sprintf("Intercambio completado entre %s y %s", from.Name, to.Name)
	gs.AddHistory(EconomicHistoryItem{
		Type:      HistExchange,
		Title:     fmt.Sprintf("Intercambio %s ↔ %s", from.Name, to.Name),
		Detail:    fmt.Sprintf("Props: %v ↔ %v | Cash: $%d ↔ $%d", p.OfferProperties, p.RequestProperties, p.OfferMoney, p.RequestMoney),
		PlayerIDs: []string{p.FromPlayerID, p.ToPlayerID},
	})
	gs.ExchangeProposal = nil
}

// checkBankruptcy declares bankruptcy if the player can't recover.
func checkBankruptcy(gs *GameState, playerID string) {
	p := gs.FindPlayer(playerID)
	if p == nil || p.Cash >= 0 {
		return
	}
	if !CanPlayerAvoidBankruptcy(gs, playerID) {
		DeclareBankruptcy(gs, playerID)
	}
}

// CanPlayerAvoidBankruptcy checks if player can liquidate enough to cover debt.
func CanPlayerAvoidBankruptcy(gs *GameState, playerID string) bool {
	p := gs.FindPlayer(playerID)
	if p == nil {
		return false
	}
	if p.Cash >= 0 {
		return true
	}
	return p.Cash+EmergencyLiquidationValue(gs, playerID) >= 0
}

// EmergencyLiquidationValue computes max cash from selling/mortgaging all assets.
func EmergencyLiquidationValue(gs *GameState, playerID string) int {
	total := 0
	for _, tile := range config.BoardTiles {
		if tile.Price == nil || gs.PropertyOwners[tile.Index] != playerID {
			continue
		}
		d := gs.GetDevelopment(tile.Index)
		if tile.Type == config.TileTypeProperty {
			if d.Hotel {
				total += config.HotelCostForPrice(*tile.Price) / 2
				total += 4 * (config.HouseCostForPrice(*tile.Price) / 2)
			} else if d.Houses > 0 {
				total += d.Houses * (config.HouseCostForPrice(*tile.Price) / 2)
			}
		}
		if !d.Mortgaged {
			total += config.MortgageValueForPrice(*tile.Price)
		}
	}
	return total
}

func movePath(from, to int) []int {
	from = ((from % 40) + 40) % 40
	to = ((to % 40) + 40) % 40
	path := []int{}
	cur := from
	for cur != to {
		cur = (cur + 1) % 40
		path = append(path, cur)
	}
	return path
}

func min4(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max0(a, b int) int {
	if a > b {
		return a
	}
	return b
}
