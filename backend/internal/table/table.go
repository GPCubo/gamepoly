// Package table owns the game goroutine per table.
// Imports: game (logic), proto (message types), gorilla/websocket (conn).
// NOT imported by ws or api — they import table, not the other way around.
package table

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"gamepolyweb/backend/internal/game"
	"gamepolyweb/backend/internal/proto"

	gorilla "github.com/gorilla/websocket"
)

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
}

const (
	inactivityTimeout = 120 * time.Minute
	gracePeriodMs     = 30_000
	writeWait         = 10 * time.Second
	pongWait          = 60 * time.Second
	pingPeriod        = 50 * time.Second
	clientMoveStep    = 300 * time.Millisecond
	clientMoveReveal  = 600 * time.Millisecond
)

// NewTable builds a Table from pre-built slots and starts the game.
func NewTable(id string, slots []PlayerSlot, opts game.GameOptions) *Table {
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

	slotMap := make(map[string]*PlayerSlot, len(slots))
	for i := range slots {
		cp := slots[i]
		slotMap[cp.ID] = &cp
	}

	t := &Table{
		ID:           id,
		State:        gs,
		Slots:        slotMap,
		Inbox:        make(chan IncomingAction, 64),
		quit:         make(chan struct{}),
		lastActivity: time.Now(),
		StartedAt:    time.Now(),
	}
	t.botTimer = time.NewTimer(0)
	t.botTimer.Stop()
	t.inactiveTimer = time.NewTimer(inactivityTimeout)
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
	}()

	t.maybeScheduleBotTurn()

	for {
		select {
		case action := <-t.Inbox:
			t.lastActivity = time.Now()
			t.inactiveTimer.Reset(inactivityTimeout)
			t.processAction(action)
			t.Broadcast(proto.NewSnapshot(t.State))
			t.maybeScheduleBotTurn()
			t.checkGameOver()

		case <-t.botTimer.C:
			t.executeBotStep()
			t.Broadcast(proto.NewSnapshot(t.State))
			t.maybeScheduleBotTurn()
			t.checkGameOver()

		case <-t.inactiveTimer.C:
			log.Printf("table %s: inactivity timeout", t.ID)
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
	t.mu.Lock()
	slot, ok := t.Slots[conn.PlayerID]
	if ok && !slot.IsBot {
		slot.Conn = conn
	}
	t.mu.Unlock()

	go t.writePump(conn)
	// Send full snapshot immediately
	t.sendTo(conn.PlayerID, proto.NewSnapshot(t.State))
}

// RemoveConn handles WebSocket disconnect.
func (t *Table) RemoveConn(playerID string) {
	t.mu.Lock()
	if slot, ok := t.Slots[playerID]; ok {
		slot.Conn = nil
	}
	t.mu.Unlock()
	t.Broadcast(proto.New("player_disconnected", proto.PlayerDisconnectedPayload{
		PlayerID:      playerID,
		GracePeriodMs: gracePeriodMs,
	}))
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
			if p.Accepted {
				game.ExecuteExchange(t.State)
				t.Broadcast(proto.New("trade_responded", proto.TradeRespondedPayload{Accepted: true, Summary: "Intercambio realizado"}))
			} else {
				t.State.ExchangeProposal = nil
				t.Broadcast(proto.New("trade_responded", proto.TradeRespondedPayload{Accepted: false}))
			}
		}
	case "accept_card":
		t.doAcceptCard(pID)
	case "heartbeat":
		// no-op
	}
}

// ─── handlers ────────────────────────────────────────────────────────────────

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
		t.Broadcast(proto.New("player_jailed", proto.PlayerJailedPayload{PlayerID: pID}))
		t.State.IsTurnComplete = true
		return
	case game.DoublesExtra:
		// Move player and resolve landing. IsTurnComplete will be set to true.
		// When player/bot calls next_turn, FinishTurnKeepPlayer resets
		// IsTurnComplete to false and keeps the same player for the extra roll.
		fallthrough
	default:
		mr := game.MovePlayer(t.State, total)
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
			t.Broadcast(proto.New("card_drawn", proto.CardDrawnPayload{
				PlayerID: pID,
				CardID:   card.ID,
				Text:     card.Text,
			}))
		}
		// Bots accept cards automatically
		if slot, ok := t.Slots[pID]; ok && slot.IsBot {
			t.doAcceptCard(pID)
		}

	case game.ResolutionJail:
		t.Broadcast(proto.New("player_jailed", proto.PlayerJailedPayload{PlayerID: pID}))
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
	if tile := game.GetOwnableTilePublic(tileIndex); tile != nil && tile.Price != nil {
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
		t.Broadcast(proto.New("player_jailed", proto.PlayerJailedPayload{PlayerID: pID}))
		t.State.IsTurnComplete = true
	}
	if !result.Moved && !result.Jailed {
		t.State.IsTurnComplete = true
	}
}

// ─── bot automation ───────────────────────────────────────────────────────────

func (t *Table) maybeScheduleBotTurn() {
	p := t.State.ActivePlayer()
	if p == nil || !p.IsBot || t.State.Winner() != nil {
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
	if p == nil || p.ID != playerID || !p.IsBot || pathLen <= 0 {
		return
	}
	delay := time.Duration(pathLen-1)*clientMoveStep + clientMoveReveal
	if delay > t.nextBotDelay {
		t.nextBotDelay = delay
	}
}

func (t *Table) executeBotStep() {
	// Auction bot turn
	if t.State.IsAuctionActive && t.State.Auction != nil {
		bidderIdx := t.State.Auction.BidderIdx
		if bidderIdx < len(t.State.Auction.ActiveBidders) {
			currentBidder := t.State.Auction.ActiveBidders[bidderIdx]
			if slot, ok := t.Slots[currentBidder]; ok && slot.IsBot {
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
				return
			}
		}
	}

	// Regular bot turn
	p := t.State.ActivePlayer()
	if p == nil || !p.IsBot {
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

	actions := game.DecideBotTurn(t.State)
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
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func (t *Table) checkGameOver() {
	if w := t.State.Winner(); w != nil {
		t.Broadcast(proto.New("game_over", proto.GameOverPayload{WinnerID: w.ID}))
		t.Close()
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
