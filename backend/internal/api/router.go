package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"gamepolyweb/backend/internal/game"
	"gamepolyweb/backend/internal/proto"
	"gamepolyweb/backend/internal/store"
	"gamepolyweb/backend/internal/table"

	jwtlib "github.com/golang-jwt/jwt/v5"
	gorilla "github.com/gorilla/websocket"
)

var upgrader = gorilla.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// clientErrRateLimiter is a simple per-key sliding-window rate limiter.
type clientErrRateLimiter struct {
	mu      sync.Mutex
	buckets map[string][]time.Time
}

func newClientErrRateLimiter() *clientErrRateLimiter {
	return &clientErrRateLimiter{buckets: make(map[string][]time.Time)}
}

func (rl *clientErrRateLimiter) Allow(key string, limit int, window time.Duration) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	cutoff := now.Add(-window)
	prev := rl.buckets[key]
	valid := prev[:0]
	for _, t := range prev {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}
	if len(valid) >= limit {
		rl.buckets[key] = valid
		return false
	}
	rl.buckets[key] = append(valid, now)
	return true
}

type Router struct {
	Manager         *table.Manager
	Store           *store.RedisStore
	jwtKey          []byte
	clientErrorRepo *store.ClientErrorRepository
	clientErrRL     *clientErrRateLimiter
}

func NewRouter(mgr *table.Manager, rs *store.RedisStore) *Router {
	key := os.Getenv("JWT_SECRET")
	if key == "" {
		key = "dev-secret-change-in-production"
	}
	return &Router{Manager: mgr, Store: rs, jwtKey: []byte(key)}
}

// SetClientErrorRepo enables the client error reporting endpoint.
func (rt *Router) SetClientErrorRepo(repo *store.ClientErrorRepository) {
	rt.clientErrorRepo = repo
	rt.clientErrRL = newClientErrRateLimiter()
}

func (rt *Router) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/v1/auth/guest", rt.handleGuestAuth)
	mux.HandleFunc("/api/v1/tables", rt.handleTables)
	mux.HandleFunc("/api/v1/tables/", rt.handleTable)
	mux.HandleFunc("/api/v1/client-errors", rt.handleClientErrors)
	mux.HandleFunc("/ws", rt.handleWS)
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})
}

// ─── client error reporting ───────────────────────────────────────────────────

var allowedSeverity = map[string]bool{"error": true, "warning": true, "info": true}
var allowedSource = map[string]bool{
	"vue": true, "window": true, "unhandled_rejection": true, "manual": true,
}
var sensitiveContextKeys = map[string]bool{
	"token": true, "jwt": true, "password": true, "secret": true, "auth": true, "session": true,
}

func (rt *Router) handleClientErrors(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Always respond 204 when persistence is off — frontend keeps working.
	if rt.clientErrorRepo == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// Per-IP rate limit: 30 req/min.
	ip := r.RemoteAddr
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		ip = strings.TrimSpace(strings.SplitN(fwd, ",", 2)[0])
	}
	if !rt.clientErrRL.Allow(ip, 30, time.Minute) {
		http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
		return
	}

	const maxBody = 32768
	r.Body = http.MaxBytesReader(w, r.Body, maxBody)

	var payload store.ClientErrorPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	if !allowedSeverity[payload.Severity] {
		payload.Severity = "error"
	}
	if !allowedSource[payload.Source] {
		payload.Source = "unknown"
	}
	for k := range payload.Context {
		if sensitiveContextKeys[strings.ToLower(k)] {
			delete(payload.Context, k)
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	if err := rt.clientErrorRepo.Save(ctx, payload); err != nil {
		log.Printf("[client-errors] save failed: %v", err)
	}

	w.WriteHeader(http.StatusNoContent)
}

// ─── auth ─────────────────────────────────────────────────────────────────────

func (rt *Router) handleGuestAuth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		http.Error(w, "name required", http.StatusBadRequest)
		return
	}

	playerID := fmt.Sprintf("p-%d", time.Now().UnixNano())
	token := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, jwtlib.MapClaims{
		"playerId": playerID,
		"name":     req.Name,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	})
	signed, err := token.SignedString(rt.jwtKey)
	if err != nil {
		http.Error(w, "token error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"token": signed, "playerId": playerID})
}

// ─── tables ───────────────────────────────────────────────────────────────────

func (rt *Router) handleTables(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	switch r.Method {
	case http.MethodGet:
		ids := rt.Manager.ListOpen()
		writeJSON(w, map[string]any{"tables": ids, "count": len(ids)})
	case http.MethodPost:
		rt.createTable(w, r)
	case http.MethodOptions:
		w.WriteHeader(http.StatusOK)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (rt *Router) createTable(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CreatorName string `json:"creatorName"`
		Config      struct {
			StartingCash         int      `json:"startingCash"`
			GoSalary             int      `json:"goSalary"`
			CanSkipBuy           bool     `json:"canSkipBuy"`
			AuctionOnly          bool     `json:"auctionOnly"`
			DoublesGiveExtraTurn bool     `json:"doublesGiveExtraTurn"`
			JailBailCost         int      `json:"jailBailCost"`
			ScenarioSeeds        []string `json:"scenarioSeeds"`
		} `json:"config"`
		Slots []struct {
			Type       string `json:"type"` // "human" | "bot" | "open"
			Name       string `json:"name"`
			Difficulty string `json:"difficulty"`
			TokenModel string `json:"tokenModel"`
		} `json:"slots"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request: "+err.Error(), http.StatusBadRequest)
		return
	}
	if len(req.Slots) < 2 {
		http.Error(w, "need at least 2 slots", http.StatusBadRequest)
		return
	}

	opts := game.GameOptions{
		GoSalary:         req.Config.GoSalary,
		JailBailCost:     req.Config.JailBailCost,
		CanSkipBuy:       req.Config.CanSkipBuy,
		AuctionOnly:      req.Config.AuctionOnly,
		DoublesGiveExtra: req.Config.DoublesGiveExtraTurn,
		ScenarioSeeds:    req.Config.ScenarioSeeds,
	}
	if opts.GoSalary == 0 {
		opts.GoSalary = 200
	}
	if opts.JailBailCost == 0 {
		opts.JailBailCost = 50
	}

	slots := make([]table.SlotConfig, len(req.Slots))
	for i, s := range req.Slots {
		diff := game.BotDifficulty(s.Difficulty)
		if diff == "" {
			diff = game.BotRegular
		}
		name := s.Name
		if name == "" && s.Type == "open" {
			name = "open"
		}
		slots[i] = table.SlotConfig{
			Name:       name,
			TokenModel: s.TokenModel,
			Type:       s.Type,
			Difficulty: diff,
		}
	}

	result, err := rt.Manager.Create(table.CreateRequest{Slots: slots, Opts: opts})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]string{
		"tableId":  result.TableID,
		"playerId": result.PlayerID,
	})
}

func (rt *Router) handleTable(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	// /api/v1/tables/{id}[/{action}]
	path := r.URL.Path[len("/api/v1/tables/"):]
	parts := splitPath(path)
	if len(parts) == 0 {
		http.Error(w, "table id required", http.StatusBadRequest)
		return
	}
	tableID := parts[0]

	switch {
	case r.Method == http.MethodGet && len(parts) == 1:
		t := rt.Manager.Get(tableID)
		if t == nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		writeJSON(w, t.State)

	case r.Method == http.MethodPost && len(parts) == 2 && parts[1] == "join":
		var req struct {
			PlayerName string `json:"playerName"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlayerName == "" {
			http.Error(w, "playerName required", http.StatusBadRequest)
			return
		}
		playerID, err := rt.Manager.Join(tableID, req.PlayerName)
		if err != nil {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		writeJSON(w, map[string]string{"playerId": playerID})

	case r.Method == http.MethodDelete && len(parts) == 1:
		rt.Manager.Remove(tableID)
		w.WriteHeader(http.StatusNoContent)

	default:
		http.Error(w, "not found", http.StatusNotFound)
	}
}

// ─── websocket ────────────────────────────────────────────────────────────────

func (rt *Router) handleWS(w http.ResponseWriter, r *http.Request) {
	tableID := r.URL.Query().Get("tableId")
	playerID := r.URL.Query().Get("playerId")
	if tableID == "" || playerID == "" {
		http.Error(w, "tableId and playerId required", http.StatusBadRequest)
		return
	}

	t := rt.Manager.Get(tableID)
	if t == nil {
		http.Error(w, "table not found", http.StatusNotFound)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade error: %v", err)
		return
	}

	pc := &table.PlayerConn{
		PlayerID: playerID,
		Conn:     conn,
		Send:     make(chan []byte, 256),
	}
	t.AddConn(pc)

	// Notify others
	playerName := playerID
	if p := t.State.FindPlayer(playerID); p != nil {
		playerName = p.Name
	}
	t.Broadcast(proto.New("player_connected", proto.PlayerConnectedPayload{
		PlayerID: playerID,
		Name:     playerName,
	}))

	// Read pump
	go func() {
		defer func() {
			t.RemoveConn(playerID)
			conn.Close()
		}()

		conn.SetReadLimit(8192)
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		conn.SetPongHandler(func(string) error {
			conn.SetReadDeadline(time.Now().Add(60 * time.Second))
			return nil
		})

		for {
			_, rawMsg, err := conn.ReadMessage()
			if err != nil {
				if gorilla.IsUnexpectedCloseError(err, gorilla.CloseGoingAway, gorilla.CloseAbnormalClosure) {
					log.Printf("ws read error player %s: %v", playerID, err)
				}
				return
			}

			var msg proto.IncomingMsg
			if err := json.Unmarshal(rawMsg, &msg); err != nil {
				continue
			}

			t.Inbox <- table.IncomingAction{
				Type:     msg.Type,
				Payload:  msg.Payload,
				PlayerID: playerID,
			}
		}
	}()
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func setCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

func splitPath(path string) []string {
	var parts []string
	cur := ""
	for _, c := range path {
		if c == '/' {
			if cur != "" {
				parts = append(parts, cur)
				cur = ""
			}
		} else {
			cur += string(c)
		}
	}
	if cur != "" {
		parts = append(parts, cur)
	}
	return parts
}
