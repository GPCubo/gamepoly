package table

import (
	"errors"
	"sync"

	"gamepolyweb/backend/internal/game"

	"github.com/google/uuid"
)

var (
	errInvalidTokenModel = errors.New("ficha invalida")
	errTokenAlreadyUsed  = errors.New("esa ficha ya esta en uso")
)

// Manager holds all active tables.
type Manager struct {
	tables map[string]*Table
	mu     sync.RWMutex
	repo   FinishedGameRepo // nil when Postgres not configured
}

func NewManager(repo FinishedGameRepo) *Manager {
	return &Manager{
		tables: make(map[string]*Table),
		repo:   repo,
	}
}

// CreateRequest holds the parameters for creating a new table.
type CreateRequest struct {
	Slots []SlotConfig
	Opts  game.GameOptions
}

// SlotConfig is the input type for each seat.
type SlotConfig struct {
	Name       string
	TokenModel string
	Type       string // "human" | "bot" | "open"
	Difficulty game.BotDifficulty
}

// CreateResult holds the IDs generated for a new table.
type CreateResult struct {
	TableID     string
	PlayerID    string // ID for the first human slot (creator)
	Token       string // JWT (minted by caller)
	Phase       game.Phase
	AutoStarted bool
}

// Create creates a new table and starts its goroutine.
func (m *Manager) Create(req CreateRequest) (*CreateResult, error) {
	tableID := "T-" + uuid.New().String()[:8]
	creatorPlayerID := ""
	hasOpenSlot := false
	usedTokens := make(map[string]bool)

	slots := make([]PlayerSlot, 0, len(req.Slots))
	for i, sc := range req.Slots {
		pid := uuid.New().String()[:8]
		isBot := sc.Type == "bot"
		tokenModel := ""
		if sc.Type == "open" {
			hasOpenSlot = true
			isBot = false // placeholder slot; will be filled when someone joins
		} else {
			var err error
			tokenModel, err = chooseTokenModel(sc.TokenModel, i, usedTokens)
			if err != nil {
				return nil, err
			}
			usedTokens[tokenModel] = true
		}
		if i == 0 && sc.Type == "human" {
			creatorPlayerID = pid
		}
		slots = append(slots, PlayerSlot{
			ID:         pid,
			Name:       sc.Name,
			TokenModel: tokenModel,
			IsBot:      isBot,
			Difficulty: sc.Difficulty,
		})
	}

	if creatorPlayerID == "" {
		// No human slot defined — give creator first slot anyway
		creatorPlayerID = slots[0].ID
	}

	req.Opts.StartInSetup = hasOpenSlot
	t := NewTable(tableID, slots, req.Opts, m.repo)
	m.mu.Lock()
	m.tables[tableID] = t
	m.mu.Unlock()

	go t.Run()

	return &CreateResult{
		TableID:     tableID,
		PlayerID:    creatorPlayerID,
		Phase:       t.State.Phase,
		AutoStarted: t.State.Phase == game.PhasePlaying,
	}, nil
}

type JoinResult struct {
	PlayerID string
	Phase    game.Phase
}

// Join assigns an "open" slot to a new human player.
func (m *Manager) Join(tableID, playerName string, tokenModel string) (*JoinResult, error) {
	t := m.Get(tableID)
	if t == nil {
		return nil, errors.New("mesa no encontrada")
	}
	t.mu.Lock()
	usedTokens := make(map[string]bool)
	hasOpenSlot := false
	for _, slot := range t.Slots {
		if slot.IsBot || !isOpenPlayerName(slot.Name) {
			usedTokens[slot.TokenModel] = true
			continue
		}
		if !slot.IsBot && slot.Conn == nil {
			hasOpenSlot = true
		}
	}
	if !hasOpenSlot {
		t.mu.Unlock()
		return nil, errors.New("mesa llena")
	}
	chosenToken, err := chooseTokenModel(tokenModel, 0, usedTokens)
	if err != nil {
		t.mu.Unlock()
		return nil, err
	}

	for _, slot := range t.Slots {
		if !slot.IsBot && slot.Conn == nil {
			// Check if this slot is truly unoccupied (player's name starts with "Esperando")
			if isOpenPlayerName(slot.Name) {
				slot.Name = playerName
				slot.TokenModel = chosenToken
				// Update the GameState player name too
				if p := t.State.FindPlayer(slot.ID); p != nil {
					p.Name = playerName
					p.TokenModel = chosenToken
				}
				playerID := slot.ID
				t.mu.Unlock()
				t.onLobbyChanged()
				return &JoinResult{PlayerID: playerID, Phase: t.State.Phase}, nil
			}
		}
	}
	t.mu.Unlock()
	return nil, errors.New("mesa llena")
}

// Get retrieves a table by ID.
func (m *Manager) Get(tableID string) *Table {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.tables[tableID]
}

// Remove removes a table.
func (m *Manager) Remove(tableID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if t, ok := m.tables[tableID]; ok {
		t.Close()
		delete(m.tables, tableID)
	}
}

// ListOpen returns IDs of all active tables.
func (m *Manager) ListOpen() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	ids := make([]string, 0, len(m.tables))
	for id := range m.tables {
		ids = append(ids, id)
	}
	return ids
}
