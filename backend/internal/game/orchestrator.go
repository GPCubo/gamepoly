package game

import "gamepolyweb/backend/internal/config"

// TileResolution describes what happens when a player lands on a tile.
type TileResolution string

const (
	ResolutionBuyable  TileResolution = "buyable"   // can buy or auction
	ResolutionRent     TileResolution = "rent"       // must pay rent
	ResolutionCard     TileResolution = "card"       // draw a card
	ResolutionTax      TileResolution = "tax"        // pay tax automatically
	ResolutionJail     TileResolution = "jail"       // sent to jail
	ResolutionFree     TileResolution = "free"       // no action
)

// ResolveLanding determines what should happen after a player lands.
func ResolveLanding(gs *GameState, playerID string, diceTotal int) TileResolution {
	p := gs.FindPlayer(playerID)
	if p == nil {
		return ResolutionFree
	}
	pos := ((p.Position % 40) + 40) % 40
	tile := gs.Board.GetTile(pos)
	if tile == nil {
		return ResolutionFree
	}

	switch tile.Group {
	case "gotojail":
		SendToJail(gs, playerID)
		return ResolutionJail

	case "tax":
		PayTax(gs, playerID, pos)
		return ResolutionTax

	case "chance", "community":
		return ResolutionCard

	case "go", "jail", "parking":
		return ResolutionFree
	}

	switch tile.Type {
	case config.TileTypeProperty, config.TileTypeRailroad, config.TileTypeUtility:
		ownerID, owned := gs.PropertyOwners[pos]
		if !owned {
			return ResolutionBuyable
		}
		if ownerID == playerID {
			return ResolutionFree // own property
		}
		if gs.IsBankrupt(ownerID) {
			return ResolutionFree
		}
		dev := gs.GetDevelopment(pos)
		if dev.Mortgaged {
			return ResolutionFree
		}
		return ResolutionRent
	}

	return ResolutionFree
}

// SetupGame initializes a new game from a list of slot configs.
type SlotConfig struct {
	ID            string
	Name          string
	TokenModel    string
	StartingCash  int
	IsBot         bool
	BotDifficulty BotDifficulty
}

func SetupGame(gs *GameState, slots []SlotConfig, opts GameOptions) {
	if opts.StartInSetup {
		gs.Phase = PhaseSetup
	} else {
		gs.Phase = PhasePlaying
	}
	gs.ActivePlayerIndex = 0
	gs.IsTurnComplete = false
	gs.IsDoubles = false
	gs.BankruptPlayers = []string{}
	gs.PropertyOwners = make(map[int]string)
	gs.PropertyDevelopments = make(map[int]PropertyDevelopment)
	gs.IsAuctionActive = false
	gs.Auction = nil
	gs.ExchangeProposal = nil
	gs.StartOrder = nil
	gs.ActiveCard = nil
	gs.EconomicHistory = []EconomicHistoryItem{}
	gs.HistoryCounter = 0

	gs.GoSalary = opts.GoSalary
	gs.JailBailCost = opts.JailBailCost
	gs.CanSkipBuy = opts.CanSkipBuy
	gs.AuctionOnly = opts.AuctionOnly
	gs.DoublesGiveExtra = opts.DoublesGiveExtra

	if opts.Board != nil {
		gs.Board = opts.Board
	} else {
		gs.Board = DefaultBoardConfig()
	}
	gs.BoardSlug = gs.Board.Slug

	gs.ChanceDeck = gs.Board.ShuffleDeck(len(gs.Board.ChanceCards))
	gs.CommunityDeck = gs.Board.ShuffleDeck(len(gs.Board.CommunityCards))

	players := make([]*PlayerState, len(slots))
	for i, s := range slots {
		players[i] = &PlayerState{
			ID:            s.ID,
			Name:          s.Name,
			TokenModel:    s.TokenModel,
			Position:      0,
			Cash:          s.StartingCash,
			IsBot:         s.IsBot,
			BotDifficulty: s.BotDifficulty,
			Connected:     s.IsBot,
		}
	}
	gs.Players = players
	if len(players) > 0 {
		gs.StatusMessage = "¡" + players[0].Name + " comienza!"
	}
	if gs.Phase == PhaseSetup {
		EnsureStartOrder(gs)
	}
}

// GameOptions holds configuration for a new game.
type GameOptions struct {
	GoSalary         int
	JailBailCost     int
	CanSkipBuy       bool
	AuctionOnly      bool
	DoublesGiveExtra bool
	ScenarioSeeds    []string
	StartInSetup     bool
	BoardSlug        string       // which board to play; empty = default
	Board            *BoardConfig // resolved board config; nil uses hardcoded default
}

func DefaultOptions() GameOptions {
	return GameOptions{
		GoSalary:        200,
		JailBailCost:    50,
		DoublesGiveExtra: true,
	}
}
