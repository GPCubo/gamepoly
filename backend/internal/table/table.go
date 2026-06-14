// Package table owns the game goroutine per table.
// Imports: game (logic), proto (message types), gorilla/websocket (conn).
// NOT imported by ws or api — they import table, not the other way around.
package table

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"sync"
	"time"

	"gamepolyweb/backend/internal/game"
	"gamepolyweb/backend/internal/proto"

	gorilla "github.com/gorilla/websocket"
)

// FinishedGameRepo is implemented by store.FinishedGameRepository.
// Defined here to avoid an import cycle (table → store → game → table).
type FinishedGameRepo interface {
	SaveFinishedGame(ctx context.Context, tableID string, gs *game.GameState, reason string, startedAt time.Time) error
}

// PlayerConn wraps a WebSocket connection with a buffered send channel.
type PlayerConn struct {
	PlayerID string
	Conn     *gorilla.Conn
	Send     chan []byte
}

// PlayerSlot represents one seat at the table.
type PlayerSlot struct {
	ID         string
	Name       string
	TokenModel string
	IsBot      bool
	Difficulty game.BotDifficulty
	Conn       *PlayerConn // nil for bots and disconnected humans
}

// IncomingAction is sent by a connection's read-pump into the table Inbox.
type IncomingAction struct {
	Type     string
	Payload  json.RawMessage
	PlayerID string
}

// Table owns a single game and processes all actions serially in one goroutine.
type Table struct {
	ID            string
	State         *game.GameState
	Slots         map[string]*PlayerSlot
	Inbox         chan IncomingAction
	botTimer      *time.Timer
	inactiveTimer *time.Timer
	turnTimer     *time.Timer
	quit          chan struct{}
	mu            sync.RWMutex
	lastActivity  time.Time
	StartedAt     time.Time
	nextBotDelay  time.Duration

	// awaitingBuyDecision is true after the active player lands on an unowned
	// buyable tile and the game is waiting for a buy/pass action. It lets the
	// bot orchestration tell "just landed, decide buy" apart from "turn start,
	// must roll" without re-running the side-effectful ResolveLanding.
	awaitingBuyDecision bool

	// botTradeLastProposed tracks when each bot last proposed an exchange,
	// used to enforce cooldowns and prevent spam.
	botTradeLastProposed map[string]time.Time

	// repo persists finished games to PostgreSQL. nil when not configured.
	repo      FinishedGameRepo
	// persisted ensures we only write to Postgres once per table lifetime.
	persisted bool
}

const (
	inactivityTimeout = 120 * time.Minute
	gracePeriodMs     = 30_000
	writeWait         = 10 * time.Second
	pongWait          = 60 * time.Second
	pingPeriod        = 50 * time.Second
	clientMoveStep    = 300 * time.Millisecond
	clientMoveReveal  = 600 * time.Millisecond
	turnDuration      = 60 * time.Second
)

// NewTable builds a Table from pre-built slots and starts the game.
func NewTable(id string, slots []PlayerSlot, opts game.GameOptions, repo FinishedGameRepo) *Table {
	gs := game.NewGameState(id)
	slotConfigs := make([]game.SlotConfig, len(slots))
	for i, s := range slots {
		tok := normalizeTokenModel(s.TokenModel, i)
		slotConfigs[i] = game.SlotConfig{
			ID:            s.ID,
			Name:          s.Name,
			TokenModel:    tok,
			StartingCash:  1500,
			IsBot:         s.IsBot,
			BotDifficulty: s.Difficulty,
		}
	}
	game.SetupGame(gs, slotConfigs, opts)
	game.ApplyScenarioSeeds(gs, opts.ScenarioSeeds)

	slotMap := make(map[string]*PlayerSlot, len(slots))
	for i := range slots {
		cp := slots[i]
		slotMap[cp.ID] = &cp
	}

	t := &Table{
		ID:                   id,
		State:                gs,
		Slots:                slotMap,
		Inbox:                make(chan IncomingAction, 64),
		quit:                 make(chan struct{}),
		lastActivity:         time.Now(),
		StartedAt:            time.Now(),
		botTradeLastProposed: make(map[string]time.Time),
		repo:                 repo,
	}
	t.botTimer = time.NewTimer(0)
	t.botTimer.Stop()
	t.inactiveTimer = time.NewTimer(inactivityTimeout)
	t.turnTimer = time.NewTimer(0)
	t.turnTimer.Stop()
	t.resetTurnTimer()
	return t
}

// Run is the single-goroutine event loop.
func (t *Table) Run() {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("table %s panic: %v", t.ID, r)
		}
		t.botTimer.Stop()
		t.inactiveTimer.Stop()
		t.turnTimer.Stop()
	}()

	t.maybeScheduleBotTurn()

	for {
		select {
		case action := <-t.Inbox:
			t.lastActivity = time.Now()
			t.inactiveTimer.Reset(inactivityTimeout)
			t.processAction(action)
			if action.Type != "heartbeat" && action.Type != "ping" {
				t.Broadcast(proto.NewSnapshot(t.State))
				t.maybeScheduleBotTurn()
				t.resetTurnTimer()
				t.checkGameOver()
			}

		case <-t.botTimer.C:
			t.executeBotStep()
			t.Broadcast(proto.NewSnapshot(t.State))
			t.maybeScheduleBotTurn()
			t.resetTurnTimer()
			t.checkGameOver()

		case <-t.turnTimer.C:
			t.handleTurnTimeout()
			t.Broadcast(proto.NewSnapshot(t.State))
			t.maybeScheduleBotTurn()
			t.resetTurnTimer()
			t.checkGameOver()

		case <-t.inactiveTimer.C:
			log.Printf("table %s: inactivity timeout", t.ID)
			t.saveFinishedGame("inactivity_timeout")
			t.Close()
			return

		case <-t.quit:
			return
		}
	}
}

// Close signals the table to stop.
func (t *Table) Close() {
	select {
	case <-t.quit:
	default:
		close(t.quit)
	}
}

// AddConn registers a WebSocket connection for a human player.
func (t *Table) AddConn(conn *PlayerConn) {
	var reconnected *proto.PlayerReconnectedPayload
	t.mu.Lock()
	slot, ok := t.Slots[conn.PlayerID]
	if ok && !slot.IsBot {
		slot.Conn = conn
		if p := t.State.FindPlayer(conn.PlayerID); p != nil {
			p.Connected = true
			p.ControlledByBot = false
			p.DisconnectedAt = 0
			p.ReconnectGraceMs = 0
			reconnected = &proto.PlayerReconnectedPayload{
				PlayerID: p.ID,
				Name:     p.Name,
			}
		}
	}
	t.mu.Unlock()

	if reconnected != nil {
		t.Broadcast(proto.New("player_reconnected", *reconnected))
	}
	go t.writePump(conn)
	// Send full snapshot immediately
	t.sendTo(conn.PlayerID, proto.NewSnapshot(t.State))
	t.Broadcast(proto.NewSnapshot(t.State))
}

// RemoveConn handles WebSocket disconnect.
func (t *Table) RemoveConn(playerID string) {
	t.mu.Lock()
	if slot, ok := t.Slots[playerID]; ok {
		slot.Conn = nil
		if !slot.IsBot {
			if p := t.State.FindPlayer(playerID); p != nil {
				p.Connected = false
				p.ControlledByBot = true
				p.DisconnectedAt = time.Now().UnixMilli()
				p.ReconnectGraceMs = gracePeriodMs
				if p.BotDifficulty == "" {
					p.BotDifficulty = game.BotRegular
				}
			}
		}
	}
	t.mu.Unlock()

	t.Broadcast(proto.New("player_disconnected", proto.PlayerDisconnectedPayload{
		PlayerID:      playerID,
		GracePeriodMs: gracePeriodMs,
	}))
	t.Broadcast(proto.NewSnapshot(t.State))
	select {
	case t.Inbox <- IncomingAction{Type: "connection_changed"}:
	default:
	}

	// Keep the table alive after disconnects so temporary bot control can
	// continue and humans can reconnect with the same playerId.
}

// Broadcast sends a message to all connected players.
func (t *Table) Broadcast(msg proto.OutgoingMsg) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	t.mu.RLock()
	defer t.mu.RUnlock()
	for _, slot := range t.Slots {
		if slot.Conn != nil {
			select {
			case slot.Conn.Send <- data:
			default:
				log.Printf("table %s: send buffer full for %s", t.ID, slot.ID)
			}
		}
	}
}

func (t *Table) sendTo(playerID string, msg proto.OutgoingMsg) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	t.mu.RLock()
	slot, ok := t.Slots[playerID]
	t.mu.RUnlock()
	if !ok || slot.Conn == nil {
		return
	}
	select {
	case slot.Conn.Send <- data:
	default:
	}
}

// ─── action dispatch ──────────────────────────────────────────────────────────

func (t *Table) processAction(a IncomingAction) {
	pID := a.PlayerID
	switch a.Type {
	case "roll_start_order":
		t.doRollStartOrder(pID)
	case "connection_changed":
		// State was already updated by AddConn/RemoveConn; let the table loop
		// broadcast and reschedule timers/bot control consistently.
		return
	case "ping":
		var p proto.PingPayload
		if json.Unmarshal(a.Payload, &p) == nil {
			t.sendTo(pID, proto.New("pong", p))
		}
	case "roll_dice":
		t.doRollDice(pID)
	case "buy_property":
		var p proto.BuyPropertyPayload
		if json.Unmarshal(a.Payload, &p) == nil {
			t.doBuyProperty(pID, p.TileIndex)
		}
	case "pass_buy":
		t.doPassBuy(pID)
	case "next_turn":
		t.doNextTurn(pID)
	case "pay_bail":
		t.doPayBail(pID)
	case "place_bid":
		var p proto.PlaceBidPayload
		if json.Unmarshal(a.Payload, &p) == nil {
			t.doPlaceBid(pID, p.Increment)
		}
	case "pass_bid":
		t.doPassBid(pID)
	case "build_house":
		var p proto.BuildPayload
		if json.Unmarshal(a.Payload, &p) == nil {
			if err := game.CanBuildHouse(t.State, pID, p.TileIndex); err == nil {
				game.BuildHouse(t.State, pID, p.TileIndex)
				t.Broadcast(proto.New("house_built", proto.HouseBuiltPayload{PlayerID: pID, TileIndex: p.TileIndex}))
			} else {
				t.sendTo(pID, proto.NewError("CANT_BUILD", err.Error()))
			}
		}
	case "build_hotel":
		var p proto.BuildPayload
		if json.Unmarshal(a.Payload, &p) == nil {
			if err := game.CanBuildHotel(t.State, pID, p.TileIndex); err == nil {
				game.BuildHotel(t.State, pID, p.TileIndex)
				t.Broadcast(proto.New("hotel_built", proto.HotelBuiltPayload{PlayerID: pID, TileIndex: p.TileIndex}))
			} else {
				t.sendTo(pID, proto.NewError("CANT_BUILD", err.Error()))
			}
		}
	case "sell_improvement":
		var p proto.BuildPayload
		if json.Unmarshal(a.Payload, &p) == nil {
			if err := game.CanSellImprovement(t.State, pID, p.TileIndex); err == nil {
				game.SellImprovement(t.State, pID, p.TileIndex)
			}
		}
	case "mortgage":
		var p proto.MortgagePayload
		if json.Unmarshal(a.Payload, &p) == nil {
			if err := game.CanMortgage(t.State, pID, p.TileIndex); err == nil {
				game.MortgageProperty(t.State, pID, p.TileIndex)
				t.Broadcast(proto.New("property_mortgaged", proto.PropertyMortgagedPayload{PlayerID: pID, TileIndex: p.TileIndex}))
			}
		}
	case "unmortgage":
		var p proto.MortgagePayload
		if json.Unmarshal(a.Payload, &p) == nil {
			if err := game.CanUnmortgage(t.State, pID, p.TileIndex); err == nil {
				game.UnmortgageProperty(t.State, pID, p.TileIndex)
			}
		}
	case "propose_trade":
		var p proto.ProposeTradePayload
		if json.Unmarshal(a.Payload, &p) == nil {
			if err := game.CanProposeExchange(t.State, pID, p.Proposal); err == nil {
				t.State.ExchangeProposal = &p.Proposal
				t.Broadcast(proto.New("trade_proposed", proto.TradeProposedPayload{Proposal: p.Proposal}))
			}
		}
	case "respond_trade":
		var p proto.RespondTradePayload
		if json.Unmarshal(a.Payload, &p) == nil {
			if p.Accepted && t.State.ExchangeProposal != nil {
				fromID := t.State.ExchangeProposal.FromPlayerID
				toID := t.State.ExchangeProposal.ToPlayerID
				game.ExecuteExchange(t.State)
				t.Broadcast(proto.New("trade_responded", proto.TradeRespondedPayload{Accepted: true, Summary: "Intercambio realizado"}))
				t.checkBankruptBroadcast(fromID)
				t.checkBankruptBroadcast(toID)
			} else {
				t.State.ExchangeProposal = nil
				t.Broadcast(proto.New("trade_responded", proto.TradeRespondedPayload{Accepted: false}))
			}
		}
	case "accept_card":
		t.doAcceptCard(pID)
	case "heartbeat":
		// no-op
	case "all_humans_left":
		t.saveFinishedGame("all_humans_left")
		t.Close()
	}
}

// ─── handlers ────────────────────────────────────────────────────────────────

func (t *Table) doRollStartOrder(pID string) {
	roll, err := game.RollStartOrderRandom(t.State, pID)
	if err != nil {
		t.sendTo(pID, proto.NewError("CANT_ROLL_START_ORDER", err.Error()))
		return
	}
	t.Broadcast(proto.New("start_order_rolled", proto.StartOrderRolledPayload{
		PlayerID:   roll.PlayerID,
		PlayerName: roll.PlayerName,
		DiceValues: roll.DiceValues,
		Total:      roll.Total,
		Round:      roll.Round,
	}))
	t.rollStartOrderBots()
	if t.State.Phase == game.PhasePlaying {
		if p := t.State.ActivePlayer(); p != nil {
			t.Broadcast(proto.New("game_started", proto.GameStartedPayload{
				FirstPlayerID: p.ID,
			}))
		}
	}
}

func (t *Table) doRollDice(pID string) {
	if err := game.CanRollDice(t.State, pID); err != nil {
		t.sendTo(pID, proto.NewError("CANT_ROLL", err.Error()))
		return
	}
	d1, d2, isDoubles := game.RollDice(t.State)
	total := d1 + d2
	t.Broadcast(proto.New("dice_rolled", proto.DiceRolledPayload{
		Values:    [2]int{d1, d2},
		Total:     total,
		IsDoubles: isDoubles,
	}))

	p := t.State.ActivePlayer()
	if p != nil && p.InJail {
		result := game.RollFromJail(t.State)
		if result == "stayed" {
			t.State.IsTurnComplete = true
			return
		}
	}

	doublesResult := game.CheckDoubles(t.State)
	switch doublesResult {
	case game.DoublesJail:
		t.Broadcast(proto.New("player_jailed", proto.PlayerJailedPayload{
			PlayerID: pID,
			Reason:   "Saco dobles tres veces seguidas.",
		}))
		t.State.IsTurnComplete = true
		return
	case game.DoublesExtra:
		// Move player and resolve landing. IsTurnComplete will be set to true.
		// When player/bot calls next_turn, FinishTurnKeepPlayer resets
		// IsTurnComplete to false and keeps the same player for the extra roll.
		fallthrough
	default:
		mr := game.MovePlayer(t.State, total)
		t.addMovementHistory(mr, "dice", "", "")
		t.Broadcast(proto.New("player_moved", proto.PlayerMovedPayload{
			PlayerID: mr.PlayerID,
			From:     mr.From,
			To:       mr.To,
			Path:     mr.Path,
		}))
		t.delayActiveBotUntilMovementEnds(mr.PlayerID, len(mr.Path))
		t.resolveLanding(pID, total)
	}
}

func (t *Table) resolveLanding(pID string, diceTotal int) {
	p := t.State.FindPlayer(pID)
	if p == nil {
		return
	}
	pos := ((p.Position % 40) + 40) % 40
	resolution := game.ResolveLanding(t.State, pID, diceTotal)
	t.awaitingBuyDecision = false

	switch resolution {
	case game.ResolutionBuyable:
		if t.State.AuctionOnly {
			game.StartAuction(t.State, pos, t.State.ActivePlayerIndex)
			t.Broadcast(proto.New("auction_started", proto.AuctionStartedPayload{
				TileIndex:           pos,
				StartingBidderIndex: t.State.ActivePlayerIndex,
			}))
		} else {
			// Human waits for buy/pass; bot decides in next bot step
			t.awaitingBuyDecision = true
		}

	case game.ResolutionRent:
		ownerID := t.State.PropertyOwners[pos]
		rent := game.CollectRent(t.State, pID, ownerID, pos, diceTotal)
		t.Broadcast(proto.New("rent_collected", proto.RentCollectedPayload{
			FromID: pID, ToID: ownerID, Amount: rent, TileIndex: pos,
		}))
		game.CheckBankruptcyPublic(t.State, pID)
		t.checkBankruptBroadcast(pID)
		t.State.IsTurnComplete = true

	case game.ResolutionTax:
		amount := game.GetTaxAmount(pos)
		t.Broadcast(proto.New("tax_paid", proto.TaxPaidPayload{
			PlayerID: pID, Amount: amount, TileIndex: pos,
		}))
		game.CheckBankruptcyPublic(t.State, pID)
		t.checkBankruptBroadcast(pID)
		t.State.IsTurnComplete = true

	case game.ResolutionCard:
		group := cardGroupForTile(pos)
		card := game.DrawCard(t.State, group)
		if card != nil {
			cardText := game.ResolveCardTextPublic(t.State, *card)
			t.State.AddCardHistory(game.NewCardHistoryItem(p, *card))
			t.Broadcast(proto.New("card_drawn", proto.CardDrawnPayload{
				PlayerID:  pID,
				CardID:    card.ID,
				Group:     card.Group,
				Text:      cardText,
				Action:    string(card.Action),
				Amount:    card.Amount,
				TileIndex: card.TileIndex,
			}))
		}
		// Bots accept cards automatically
		if t.isBotControlled(pID) {
			t.doAcceptCard(pID)
		}

	case game.ResolutionJail:
		t.Broadcast(proto.New("player_jailed", proto.PlayerJailedPayload{
			PlayerID: pID,
			Reason:   "Cayo en la casilla 30: Ve a la Carcel.",
		}))
		t.State.IsTurnComplete = true

	case game.ResolutionFree:
		t.State.IsTurnComplete = true
	}
}

func (t *Table) doBuyProperty(pID string, tileIndex int) {
	if err := game.CanBuyProperty(t.State, pID, tileIndex); err != nil {
		t.sendTo(pID, proto.NewError("CANT_BUY", err.Error()))
		return
	}
	price := 0
	if tile := game.GetOwnableTilePublic(t.State, tileIndex); tile != nil && tile.Price != nil {
		price = *tile.Price
	}
	game.BuyProperty(t.State, pID, tileIndex)
	t.awaitingBuyDecision = false
	t.Broadcast(proto.New("property_purchased", proto.PropertyPurchasedPayload{
		TileIndex: tileIndex, PlayerID: pID, Amount: price,
	}))
	t.State.IsTurnComplete = true
}

func (t *Table) doPassBuy(pID string) {
	ap := t.State.ActivePlayer()
	if ap == nil || ap.ID != pID {
		return
	}
	pos := ((ap.Position % 40) + 40) % 40
	t.awaitingBuyDecision = false
	game.StartAuction(t.State, pos, t.State.ActivePlayerIndex)
	t.Broadcast(proto.New("auction_started", proto.AuctionStartedPayload{
		TileIndex:           pos,
		StartingBidderIndex: t.State.ActivePlayerIndex,
	}))
}

func (t *Table) doNextTurn(pID string) {
	if err := game.CanNextTurn(t.State, pID); err != nil {
		t.sendTo(pID, proto.NewError("CANT_NEXT", err.Error()))
		return
	}
	t.awaitingBuyDecision = false
	extraTurn := t.State.IsDoubles && t.State.DoublesGiveExtra
	if extraTurn {
		game.FinishTurnKeepPlayer(t.State)
	} else {
		game.FinishTurn(t.State)
	}
}

func (t *Table) doPayBail(pID string) {
	if err := game.CanPayBail(t.State, pID); err != nil {
		t.sendTo(pID, proto.NewError("CANT_PAY_BAIL", err.Error()))
		return
	}
	game.PayBail(t.State, pID)
}

func (t *Table) doPlaceBid(pID string, increment int) {
	if err := game.CanPlaceBid(t.State, pID, increment); err != nil {
		t.sendTo(pID, proto.NewError("CANT_BID", err.Error()))
		return
	}
	ended := game.PlaceBid(t.State, pID, increment)
	bid := 0
	if t.State.Auction != nil {
		bid = t.State.Auction.CurrentBid
	}
	t.Broadcast(proto.New("bid_placed", proto.BidPlacedPayload{PlayerID: pID, Amount: bid}))
	if ended {
		tileIdx := 0
		if t.State.Auction != nil {
			tileIdx = t.State.Auction.TileIndex
		}
		t.Broadcast(proto.New("auction_ended", proto.AuctionEndedPayload{TileIndex: tileIdx}))
		t.State.IsTurnComplete = true
	}
}

func (t *Table) doPassBid(pID string) {
	if err := game.CanPassBid(t.State, pID); err != nil {
		t.sendTo(pID, proto.NewError("CANT_PASS_BID", err.Error()))
		return
	}
	ended := game.PassBid(t.State, pID)
	t.Broadcast(proto.New("bid_passed", proto.BidPassedPayload{PlayerID: pID}))
	if ended {
		tileIdx := 0
		if t.State.Auction != nil {
			tileIdx = t.State.Auction.TileIndex
		}
		t.Broadcast(proto.New("auction_ended", proto.AuctionEndedPayload{TileIndex: tileIdx}))
		t.State.IsTurnComplete = true
	}
}

func (t *Table) doAcceptCard(pID string) {
	if t.State.ActiveCard == nil {
		return
	}
	diceTotal := t.State.DiceValues[0] + t.State.DiceValues[1]
	result := game.ApplyCardEffect(t.State, pID, diceTotal)
	if result.Moved {
		t.addMovementHistory(game.MoveResult{
			PlayerID: result.PlayerID,
			From:     result.PrevPos,
			To:       result.NewPos,
			Path:     result.Path,
		}, "card", result.Card.ID, result.Card.Text)
		t.Broadcast(proto.New("player_moved", proto.PlayerMovedPayload{
			PlayerID: result.PlayerID,
			From:     result.PrevPos,
			To:       result.NewPos,
			Path:     result.Path,
		}))
		t.delayActiveBotUntilMovementEnds(result.PlayerID, len(result.Path))
		t.resolveLanding(pID, diceTotal)
	}
	if result.Jailed {
		t.Broadcast(proto.New("player_jailed", proto.PlayerJailedPayload{
			PlayerID: pID,
			Reason:   fmt.Sprintf("Carta de %s: %s", cardGroupLabel(result.Card.Group), result.Card.Text),
		}))
		t.State.IsTurnComplete = true
	}
	if !result.Moved && !result.Jailed {
		t.State.IsTurnComplete = true
	}
}

// ─── bot automation ───────────────────────────────────────────────────────────

func (t *Table) onLobbyChanged() {
	game.EnsureStartOrder(t.State)
	t.rollStartOrderBots()
	if t.State.Phase == game.PhasePlaying {
		if p := t.State.ActivePlayer(); p != nil {
			t.Broadcast(proto.New("game_started", proto.GameStartedPayload{
				FirstPlayerID: p.ID,
			}))
		}
	}
	t.Broadcast(proto.NewSnapshot(t.State))
}

func (t *Table) rollStartOrderBots() {
	for guard := 0; guard < 20; guard++ {
		if t.State.Phase != game.PhaseSetup ||
			t.State.StartOrder == nil ||
			t.State.StartOrder.Status == game.StartOrderWaiting {
			return
		}

		rolledAny := false
		for _, playerID := range t.State.StartOrder.RequiredPlayerIDs {
			if !t.isBotControlled(playerID) || game.HasStartOrderRollThisRound(t.State, playerID) {
				continue
			}
			roll, err := game.RollStartOrderRandom(t.State, playerID)
			if err != nil {
				continue
			}
			rolledAny = true
			t.Broadcast(proto.New("start_order_rolled", proto.StartOrderRolledPayload{
				PlayerID:   roll.PlayerID,
				PlayerName: roll.PlayerName,
				DiceValues: roll.DiceValues,
				Total:      roll.Total,
				Round:      roll.Round,
			}))
			if t.State.Phase == game.PhasePlaying {
				return
			}
		}
		if !rolledAny {
			return
		}
	}
}

func (t *Table) maybeScheduleBotTurn() {
	if t.State.Phase != game.PhasePlaying {
		t.nextBotDelay = 0
		return
	}
	if t.State.IsAuctionActive && t.State.Auction != nil {
		bidderID := t.currentAuctionBidderID()
		if bidderID == "" {
			t.nextBotDelay = 0
			return
		}
		if !t.isBotControlled(bidderID) {
			t.nextBotDelay = 0
			return
		}
		delay := t.nextBotDelay + game.BotThinkDelay()
		t.nextBotDelay = 0
		t.botTimer.Reset(delay)
		t.Broadcast(proto.New("bot_thinking", proto.BotThinkingPayload{
			PlayerID: bidderID,
			DelayMs:  int(delay.Milliseconds()),
		}))
		return
	}

	p := t.State.ActivePlayer()
	if p == nil || !t.isBotControlled(p.ID) || t.State.Winner() != nil {
		t.nextBotDelay = 0
		return
	}
	delay := t.nextBotDelay + game.BotThinkDelay()
	t.nextBotDelay = 0
	t.botTimer.Reset(delay)
	t.Broadcast(proto.New("bot_thinking", proto.BotThinkingPayload{
		PlayerID: p.ID,
		DelayMs:  int(delay.Milliseconds()),
	}))
}

func (t *Table) delayActiveBotUntilMovementEnds(playerID string, pathLen int) {
	p := t.State.ActivePlayer()
	if p == nil || p.ID != playerID || !t.isBotControlled(playerID) || pathLen <= 0 {
		return
	}
	delay := time.Duration(pathLen-1)*clientMoveStep + clientMoveReveal
	if delay > t.nextBotDelay {
		t.nextBotDelay = delay
	}
}

func (t *Table) addMovementHistory(mr game.MoveResult, source string, cardID string, cardText string) {
	p := t.State.FindPlayer(mr.PlayerID)
	if p == nil {
		return
	}
	t.State.AddMovementHistory(game.MovementHistoryItem{
		PlayerID:   p.ID,
		PlayerName: p.Name,
		Source:     source,
		DiceValues: t.State.DiceValues,
		DiceTotal:  t.State.DiceValues[0] + t.State.DiceValues[1],
		From:       mr.From,
		To:         mr.To,
		CardID:     cardID,
		CardText:   cardText,
	})
}

func (t *Table) executeBotStep() {
	if t.State.Phase != game.PhasePlaying {
		return
	}
	// Auction bot turn
	if t.State.IsAuctionActive && t.State.Auction != nil {
		currentBidder := t.currentAuctionBidderID()
		if currentBidder == "" {
			return
		}
		if t.isBotControlled(currentBidder) {
			botAction := game.DecideBotAuctionAction(t.State, currentBidder)
			log.Printf("[bot] %s auction action: %s inc=%d", currentBidder, botAction.Type, botAction.Increment)
			var payload json.RawMessage
			if botAction.Type == game.BotPlaceBid {
				payload, _ = json.Marshal(proto.PlaceBidPayload{Increment: botAction.Increment})
			}
			t.Broadcast(proto.New("bot_action", proto.BotActionPayload{
				PlayerID: currentBidder,
				Action:   string(botAction.Type),
			}))
			t.processAction(IncomingAction{
				Type:     string(botAction.Type),
				Payload:  payload,
				PlayerID: currentBidder,
			})
		}
		return
	}

	// Regular bot turn
	p := t.State.ActivePlayer()
	if p == nil || !t.isBotControlled(p.ID) {
		return
	}

	// Bot buy decision (after landing on a buyable tile). Gated on the explicit
	// awaitingBuyDecision flag so we never re-run the side-effectful
	// ResolveLanding (which would re-charge rent/tax) at the start of a turn.
	if t.awaitingBuyDecision && !t.State.IsAuctionActive && t.State.ActiveCard == nil {
		curPos := ((p.Position % 40) + 40) % 40
		action := game.DecideBotBuyDecision(t.State, curPos)
		log.Printf("[bot] %s buy decision: %s tile=%d cash=%d", p.ID, action.Type, action.TileIndex, p.Cash)
		payload, _ := json.Marshal(proto.BuyPropertyPayload{TileIndex: action.TileIndex})
		t.Broadcast(proto.New("bot_action", proto.BotActionPayload{
			PlayerID: p.ID,
			Action:   string(action.Type),
			TileIndex: action.TileIndex,
		}))
		t.processAction(IncomingAction{
			Type:     string(action.Type),
			Payload:  payload,
			PlayerID: p.ID,
		})
		return
	}

	var actions []game.BotAction
	t.withBotIdentity(p.ID, func() {
		actions = game.DecideBotTurn(t.State)
	})
	actionNames := make([]string, len(actions))
	for i, a := range actions {
		actionNames[i] = string(a.Type)
	}
	log.Printf("[bot] %s turn actions: %v (turnComplete=%v cash=%d)", p.ID, actionNames, t.State.IsTurnComplete, p.Cash)

	for _, a := range actions {
		var payload json.RawMessage
		actionType := string(a.Type)
		switch a.Type {
		case game.BotBuyProperty:
			payload, _ = json.Marshal(proto.BuyPropertyPayload{TileIndex: a.TileIndex})
		case game.BotBuildHouse:
			payload, _ = json.Marshal(proto.BuildPayload{TileIndex: a.TileIndex})
			actionType = "build_house"
		case game.BotBuildHotel:
			payload, _ = json.Marshal(proto.BuildPayload{TileIndex: a.TileIndex})
			actionType = "build_hotel"
		case game.BotMortgage:
			payload, _ = json.Marshal(proto.MortgagePayload{TileIndex: a.TileIndex})
			actionType = "mortgage"
		case game.BotSellImprovement:
			payload, _ = json.Marshal(proto.BuildPayload{TileIndex: a.TileIndex})
			actionType = "sell_improvement"
		case game.BotPayBail:
			actionType = "pay_bail"
		case game.BotNextTurn:
			actionType = "next_turn"
		case game.BotPassBuy:
			actionType = "pass_buy"
		case game.BotAcceptCard:
			actionType = "accept_card"
		}
		t.Broadcast(proto.New("bot_action", proto.BotActionPayload{
			PlayerID: p.ID,
			Action:   actionType,
			TileIndex: a.TileIndex,
		}))
		t.processAction(IncomingAction{Type: actionType, Payload: payload, PlayerID: p.ID})
	}

	// After turn completes, difficult bot may propose an exchange (with cooldown)
	if p.BotDifficulty == game.BotDifficult && t.State.IsTurnComplete &&
		t.State.ExchangeProposal == nil && t.State.ActiveCard == nil && !t.State.IsAuctionActive {
		const tradeCooldown = 90 * time.Second
		lastTrade, hasTraded := t.botTradeLastProposed[p.ID]
		if !hasTraded || time.Since(lastTrade) >= tradeCooldown {
			if proposal := game.DecideBotExchangeProposal(t.State, p.ID); proposal != nil {
				if err := game.CanProposeExchange(t.State, p.ID, *proposal); err == nil {
					t.State.ExchangeProposal = proposal
					t.botTradeLastProposed[p.ID] = time.Now()
					t.Broadcast(proto.New("trade_proposed", proto.TradeProposedPayload{Proposal: *proposal}))
				}
			}
		}
	}
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func (t *Table) currentAuctionBidderID() string {
	if t.State == nil || t.State.Auction == nil {
		return ""
	}
	bidderIdx := t.State.Auction.BidderIdx
	if bidderIdx < 0 || bidderIdx >= len(t.State.Auction.ActiveBidders) {
		return ""
	}
	return t.State.Auction.ActiveBidders[bidderIdx]
}

func (t *Table) isBotControlled(playerID string) bool {
	slot, ok := t.Slots[playerID]
	if !ok {
		return false
	}
	if slot.IsBot {
		return true
	}
	p := t.State.FindPlayer(playerID)
	return p != nil && p.ControlledByBot
}

func (t *Table) withBotIdentity(playerID string, fn func()) {
	p := t.State.FindPlayer(playerID)
	if p == nil || p.IsBot {
		fn()
		return
	}
	originalIsBot := p.IsBot
	originalDifficulty := p.BotDifficulty
	p.IsBot = true
	if p.BotDifficulty == "" {
		p.BotDifficulty = game.BotRegular
	}
	defer func() {
		p.IsBot = originalIsBot
		p.BotDifficulty = originalDifficulty
	}()
	fn()
}

func (t *Table) resetTurnTimer() {
	if t.turnTimer == nil {
		return
	}
	if t.State.Phase != game.PhasePlaying || t.State.Winner() != nil {
		t.State.TurnDeadlineAt = 0
		t.State.TurnDurationMs = int(turnDuration / time.Millisecond)
		t.turnTimer.Stop()
		return
	}
	deadline := time.Now().Add(turnDuration)
	t.State.TurnDurationMs = int(turnDuration / time.Millisecond)
	t.State.TurnDeadlineAt = deadline.UnixMilli()
	if !t.turnTimer.Stop() {
		select {
		case <-t.turnTimer.C:
		default:
		}
	}
	t.turnTimer.Reset(turnDuration)
}

func (t *Table) handleTurnTimeout() {
	if t.State.Phase != game.PhasePlaying {
		return
	}
	player := t.State.ActivePlayer()
	if player == nil || t.State.IsBankrupt(player.ID) {
		return
	}
	playerID := player.ID
	t.Broadcast(proto.New("turn_timeout", proto.TurnTimeoutPayload{
		PlayerID: playerID,
	}))
	if player.Cash < 0 {
		t.resolveTimedOutDebt(playerID)
		return
	}
	if t.State.IsAuctionActive && t.State.Auction != nil {
		if bidderID := t.currentAuctionBidderID(); bidderID != "" {
			t.processAction(IncomingAction{Type: "pass_bid", PlayerID: bidderID})
		}
		return
	}
	if t.State.ActiveCard != nil {
		t.processAction(IncomingAction{Type: "accept_card", PlayerID: playerID})
		return
	}
	if t.awaitingBuyDecision {
		t.processAction(IncomingAction{Type: "pass_buy", PlayerID: playerID})
		return
	}
	if t.State.IsTurnComplete {
		t.processAction(IncomingAction{Type: "next_turn", PlayerID: playerID})
		return
	}
	t.processAction(IncomingAction{Type: "roll_dice", PlayerID: playerID})
}

func (t *Table) resolveTimedOutDebt(playerID string) {
	player := t.State.FindPlayer(playerID)
	if player == nil || player.Cash >= 0 {
		return
	}

	type mortgageCandidate struct {
		tileIndex int
		price     int
	}
	candidates := make([]mortgageCandidate, 0)
	for idx, ownerID := range t.State.PropertyOwners {
		if ownerID != playerID {
			continue
		}
		tile := game.GetOwnableTilePublic(t.State, idx)
		if tile == nil || tile.Price == nil {
			continue
		}
		if err := game.CanMortgage(t.State, playerID, idx); err != nil {
			continue
		}
		candidates = append(candidates, mortgageCandidate{
			tileIndex: idx,
			price:     *tile.Price,
		})
	}
	sort.Slice(candidates, func(i, j int) bool {
		if candidates[i].price == candidates[j].price {
			return candidates[i].tileIndex < candidates[j].tileIndex
		}
		return candidates[i].price < candidates[j].price
	})

	for _, candidate := range candidates {
		if player.Cash >= 0 {
			break
		}
		game.MortgageProperty(t.State, playerID, candidate.tileIndex)
		t.Broadcast(proto.New("property_mortgaged", proto.PropertyMortgagedPayload{
			PlayerID:  playerID,
			TileIndex: candidate.tileIndex,
		}))
	}

	if player.Cash < 0 {
		game.DeclareBankruptcy(t.State, playerID)
		t.checkBankruptBroadcast(playerID)
		if t.State.Winner() == nil {
			game.FinishTurn(t.State)
		}
		return
	}

	if t.State.IsTurnComplete {
		t.processAction(IncomingAction{Type: "next_turn", PlayerID: playerID})
		return
	}
	t.State.StatusMessage = fmt.Sprintf("%s cubrio la deuda hipotecando automaticamente.", player.Name)
}

func (t *Table) checkGameOver() {
	if w := t.State.Winner(); w != nil {
		t.Broadcast(proto.New("game_over", proto.GameOverPayload{WinnerID: w.ID}))
		t.saveFinishedGame("game_over")
		t.Close()
	}
}

// saveFinishedGame persists the game exactly once. Safe to call from the
// Run() goroutine only (no locking needed for t.persisted).
func (t *Table) saveFinishedGame(reason string) {
	if t.repo == nil || t.persisted {
		return
	}
	t.persisted = true
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := t.repo.SaveFinishedGame(ctx, t.ID, t.State, reason, t.StartedAt); err != nil {
		log.Printf("[postgres] save game %s failed (%s): %v", t.ID, reason, err)
	} else {
		log.Printf("[postgres] saved game %s (%s)", t.ID, reason)
	}
}

func (t *Table) checkBankruptBroadcast(playerID string) {
	if t.State.IsBankrupt(playerID) {
		t.Broadcast(proto.New("player_bankrupt", proto.PlayerBankruptPayload{PlayerID: playerID}))
	}
}

func cardGroupForTile(pos int) string {
	chancePositions := map[int]bool{7: true, 22: true, 36: true}
	if chancePositions[pos] {
		return "chance"
	}
	return "community"
}

func cardGroupLabel(group string) string {
	if group == "chance" {
		return "Suerte"
	}
	return "Arca Comunal"
}

func (t *Table) writePump(conn *PlayerConn) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		conn.Conn.Close()
	}()
	for {
		select {
		case msg, ok := <-conn.Send:
			conn.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				conn.Conn.WriteMessage(gorilla.CloseMessage, []byte{})
				return
			}
			if err := conn.Conn.WriteMessage(gorilla.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			conn.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.Conn.WriteMessage(gorilla.PingMessage, nil); err != nil {
				return
			}
		case <-t.quit:
			return
		}
	}
}

func (t *Table) Summary() string {
	p := t.State.ActivePlayer()
	if p == nil {
		return fmt.Sprintf("table %s idle", t.ID)
	}
	return fmt.Sprintf("table %s active, turn: %s", t.ID, p.Name)
}
