package game

import (
	"gamepolyweb/backend/internal/config"
	"math/rand"
	"time"
)

// BotAction represents a decision made by the bot engine.
type BotActionType string

const (
	BotRollDice    BotActionType = "roll_dice"
	BotBuyProperty BotActionType = "buy_property"
	BotPassBuy     BotActionType = "pass_buy"
	BotPayBail     BotActionType = "pay_bail"
	BotNextTurn    BotActionType = "next_turn"
	BotPlaceBid    BotActionType = "place_bid"
	BotPassBid     BotActionType = "pass_bid"
	BotBuildHouse  BotActionType = "build_house"
	BotBuildHotel  BotActionType = "build_hotel"
	BotMortgage    BotActionType = "mortgage"
	BotAcceptCard  BotActionType = "accept_card"
)

type BotAction struct {
	Type      BotActionType
	TileIndex int
	Increment int
}

// DecideBotTurn computes what action the bot should take given current game state.
func DecideBotTurn(gs *GameState) []BotAction {
	p := gs.ActivePlayer()
	if p == nil || !p.IsBot {
		return nil
	}

	var actions []BotAction

	// Active card waiting
	if gs.ActiveCard != nil {
		return []BotAction{{Type: BotAcceptCard}}
	}

	// Turn complete — check builds/mortgages then next turn
	if gs.IsTurnComplete {
		if p.Cash < 0 {
			// Emergency mortgage
			mortgages := decideMortgages(gs, p.ID, p.BotDifficulty)
			actions = append(actions, mortgages...)
		} else {
			builds := decideBuilds(gs, p.ID, p.BotDifficulty)
			actions = append(actions, builds...)
		}
		actions = append(actions, BotAction{Type: BotNextTurn})
		return actions
	}

	// Still in jail
	if p.InJail {
		jailDecision := decideJailAction(gs, p.ID, p.BotDifficulty)
		return []BotAction{{Type: jailDecision}}
	}

	// Need to roll
	return []BotAction{{Type: BotRollDice}}
}

// DecideBotBuyDecision decides whether to buy a property after landing.
func DecideBotBuyDecision(gs *GameState, tileIndex int) BotAction {
	p := gs.ActivePlayer()
	if p == nil {
		return BotAction{Type: BotPassBuy}
	}
	tile := config.GetTile(tileIndex)
	if tile == nil || tile.Price == nil {
		return BotAction{Type: BotPassBuy}
	}

	switch p.BotDifficulty {
	case BotDifficult:
		return difficultDecideBuy(gs, p.ID, tile)
	default:
		return regularDecideBuy(gs, p.ID, tile)
	}
}

// DecideBotAuctionAction decides bid or pass for a bot bidder in the current auction.
func DecideBotAuctionAction(gs *GameState, botID string) BotAction {
	if gs.Auction == nil {
		return BotAction{Type: BotPassBid}
	}
	tile := config.GetOwnableTile(gs.Auction.TileIndex)
	if tile == nil {
		return BotAction{Type: BotPassBid}
	}
	p := gs.FindPlayer(botID)
	if p == nil {
		return BotAction{Type: BotPassBid}
	}

	var bid int
	switch p.BotDifficulty {
	case BotDifficult:
		bid = difficultAuctionBid(gs, botID, tile)
	default:
		bid = regularAuctionBid(gs, botID, tile)
	}

	if bid <= 0 {
		return BotAction{Type: BotPassBid}
	}
	increment := bid - gs.Auction.CurrentBid
	if increment <= 0 {
		return BotAction{Type: BotPassBid}
	}
	return BotAction{Type: BotPlaceBid, Increment: increment}
}

// BotThinkDelay returns a realistic delay for bot "thinking".
func BotThinkDelay() time.Duration {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	ms := 600 + r.Intn(800)
	return time.Duration(ms) * time.Millisecond
}

// ─── regular engine ──────────────────────────────────────────────────────────

func regularDecideBuy(gs *GameState, playerID string, tile *config.BoardTile) BotAction {
	p := gs.FindPlayer(playerID)
	if p == nil || tile.Price == nil {
		return BotAction{Type: BotPassBuy}
	}
	price := *tile.Price
	if p.Cash <= int(float64(price)*1.5) {
		if gs.CanSkipBuy {
			return BotAction{Type: BotPassBuy}
		}
		return BotAction{Type: BotPassBuy} // let auction happen
	}
	if p.Cash > price {
		return BotAction{Type: BotBuyProperty, TileIndex: tile.Index}
	}
	if gs.CanSkipBuy {
		return BotAction{Type: BotPassBuy}
	}
	return BotAction{Type: BotPassBuy}
}

func regularAuctionBid(gs *GameState, playerID string, tile *config.BoardTile) int {
	p := gs.FindPlayer(playerID)
	if p == nil || tile.Price == nil {
		return 0
	}
	price := *tile.Price
	currentBid := gs.Auction.CurrentBid
	if currentBid >= price {
		return 0
	}
	maxBid := min(price, int(float64(p.Cash)*0.6))
	if maxBid <= currentBid {
		return 0
	}
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	jitter := (r.Float64()*0.2 - 0.1) * float64(price)
	bidTarget := currentBid + 10 + int(jitter)
	if bidTarget > maxBid {
		return 0
	}
	return roundUp10(bidTarget)
}

// ─── difficult engine ────────────────────────────────────────────────────────

func difficultDecideBuy(gs *GameState, playerID string, tile *config.BoardTile) BotAction {
	p := gs.FindPlayer(playerID)
	if p == nil || tile.Price == nil {
		return BotAction{Type: BotPassBuy}
	}
	price := *tile.Price
	if p.Cash < int(float64(price)*1.2) {
		if gs.CanSkipBuy {
			return BotAction{Type: BotPassBuy}
		}
		return BotAction{Type: BotPassBuy}
	}
	if shouldDifficultForceAuction(gs, playerID, tile) {
		return BotAction{Type: BotPassBuy}
	}
	return BotAction{Type: BotBuyProperty, TileIndex: tile.Index}
}

func shouldDifficultForceAuction(gs *GameState, playerID string, tile *config.BoardTile) bool {
	p := gs.FindPlayer(playerID)
	if p == nil || tile.Price == nil {
		return false
	}
	price := *tile.Price
	if p.Cash < price {
		return false
	}

	opponents := 0
	richestOpponentCash := 0
	for _, opponent := range gs.ActivePlayers() {
		if opponent.ID == playerID {
			continue
		}
		opponents++
		if opponent.Cash > richestOpponentCash {
			richestOpponentCash = opponent.Cash
		}
	}
	if opponents == 0 {
		return false
	}

	maxBid := int(float64(p.Cash) * 0.6)
	opponentCashThreshold := int(float64(price) * 0.75)
	if tile.Type == config.TileTypeProperty {
		groupTiles := config.GetGroupTiles(tile.Group, config.TileTypeProperty)
		owned := countOwnedInGroup(gs, playerID, groupTiles)
		if owned == len(groupTiles)-1 {
			maxBid = int(float64(p.Cash) * 0.8)
			opponentCashThreshold = int(float64(price) * 0.55)
		}
	}
	if maxBid <= richestOpponentCash+10 {
		return false
	}
	return richestOpponentCash <= opponentCashThreshold
}

func difficultAuctionBid(gs *GameState, playerID string, tile *config.BoardTile) int {
	p := gs.FindPlayer(playerID)
	if p == nil || tile.Price == nil {
		return 0
	}
	price := *tile.Price
	currentBid := gs.Auction.CurrentBid
	maxBid := int(float64(p.Cash) * 0.6)

	// Near-completion of color group → bid more aggressively
	if tile.Type == config.TileTypeProperty {
		groupTiles := config.GetGroupTiles(tile.Group, config.TileTypeProperty)
		owned := countOwnedInGroup(gs, playerID, groupTiles)
		if owned == len(groupTiles)-1 {
			maxBid = int(float64(p.Cash) * 0.8)
		}
	}

	if maxBid <= currentBid {
		return 0
	}
	if currentBid >= int(float64(price)*1.5) {
		return 0
	}
	return min(roundUp10(currentBid+10), maxBid)
}

func decideJailAction(gs *GameState, playerID string, difficulty BotDifficulty) BotActionType {
	p := gs.FindPlayer(playerID)
	if p == nil {
		return BotRollDice
	}
	if p.Cash < gs.JailBailCost {
		return BotRollDice
	}
	if difficulty == BotDifficult {
		// Pay bail if on 3rd turn or if cash is comfortable
		if p.JailTurns >= 2 {
			return BotPayBail
		}
		if p.Cash > int(float64(gs.JailBailCost)*5) {
			return BotPayBail
		}
		return BotRollDice
	}
	// Regular: pay bail if has more than $150
	if p.Cash > 150 {
		return BotPayBail
	}
	return BotRollDice
}

func decideBuilds(gs *GameState, playerID string, difficulty BotDifficulty) []BotAction {
	var actions []BotAction
	p := gs.FindPlayer(playerID)
	if p == nil {
		return nil
	}
	cash := p.Cash
	for _, tile := range config.BoardTiles {
		if tile.Type != config.TileTypeProperty || tile.Price == nil {
			continue
		}
		if !ownsFullPropertyGroup(gs, playerID, tile.Index) {
			continue
		}
		dev := gs.GetDevelopment(tile.Index)
		if dev.Mortgaged || dev.Hotel {
			continue
		}
		if dev.Houses >= 4 {
			cost := config.HotelCostForPrice(*tile.Price)
			threshold := 1.2
			if difficulty == BotRegular {
				threshold = 3.0
			}
			if float64(cash) > float64(cost)*threshold && CanBuildHotel(gs, playerID, tile.Index) == nil {
				actions = append(actions, BotAction{Type: BotBuildHotel, TileIndex: tile.Index})
				cash -= cost
			}
		} else {
			cost := config.HouseCostForPrice(*tile.Price)
			threshold := 1.2
			if difficulty == BotRegular {
				threshold = 3.0
			}
			if float64(cash) > float64(cost)*threshold && CanBuildHouse(gs, playerID, tile.Index) == nil {
				actions = append(actions, BotAction{Type: BotBuildHouse, TileIndex: tile.Index})
				cash -= cost
			}
		}
	}
	if difficulty == BotDifficult && len(actions) > 3 {
		actions = actions[:3]
	}
	return actions
}

func decideMortgages(gs *GameState, playerID string, difficulty BotDifficulty) []BotAction {
	var actions []BotAction
	for _, tile := range config.BoardTiles {
		if tile.Price == nil {
			continue
		}
		if gs.PropertyOwners[tile.Index] != playerID {
			continue
		}
		if CanMortgage(gs, playerID, tile.Index) == nil {
			actions = append(actions, BotAction{Type: BotMortgage, TileIndex: tile.Index})
			if len(actions) >= 2 {
				break
			}
		}
	}
	return actions
}

func countOwnedInGroup(gs *GameState, playerID string, tiles []config.BoardTile) int {
	count := 0
	for _, t := range tiles {
		if gs.PropertyOwners[t.Index] == playerID {
			count++
		}
	}
	return count
}

func roundUp10(v int) int {
	if v%10 == 0 {
		return v
	}
	return ((v / 10) + 1) * 10
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
