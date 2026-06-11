package table

import (
	"errors"
	"sync"

	"gamepolyweb/backend/internal/game"

	"github.com/google/uuid"
)

// Manager holds all active tables.
type Manager struct {
	tables map[string]*Table
	mu     sync.RWMutex
}

func NewManager() *Manager {
	return &Manager{
		tables: make(map[string]*Table),
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
	TableID  string
	PlayerID string // ID for the first human slot (creator)
	Token    string // JWT (minted by caller)
}

// Create creates a new table and starts its goroutine.
func (m *Manager) Create(req CreateRequest) (*CreateResult, error) {
	tableID := "T-" + uuid.New().String()[:8]
	creatorPlayerID := ""

	slots := make([]PlayerSlot, 0, len(req.Slots))
	for i, sc := range req.Slots {
		pid := uuid.New().String()[:8]
		isBot := sc.Type == "bot"
		if sc.Type == "open" {
			isBot = false // placeholder slot; will be filled when someone joins
		}
		if i == 0 && sc.Type == "human" {
			creatorPlayerID = pid
		}
		slots = append(slots, PlayerSlot{
			ID:         pid,
			Name:       sc.Name,
			TokenModel: normalizeTokenModel(sc.TokenModel, i),
			IsBot:      isBot,
			Difficulty: sc.Difficulty,
		})
	}

	if creatorPlayerID == "" {
		// No human slot defined — give creator first slot anyway
		creatorPlayerID = slots[0].ID
	}

	t := NewTable(tableID, slots, req.Opts)
	m.mu.Lock()
	m.tables[tableID] = t
	m.mu.Unlock()

	go t.Run()

	return &CreateResult{
		TableID:  tableID,
		PlayerID: creatorPlayerID,
	}, nil
}

// Join assigns an "open" slot to a new human player.
func (m *Manager) Join(tableID, playerName string) (string, error) {
	t := m.Get(tableID)
	if t == nil {
		return "", errors.New("mesa no encontrada")
	}
	t.mu.Lock()
	defer t.mu.Unlock()

	for _, slot := range t.Slots {
		if !slot.IsBot && slot.Conn == nil {
			// Check if this slot is truly unoccupied (player's name starts with "Esperando")
			if slot.Name == "" || slot.Name == "open" {
				slot.Name = playerName
				// Update the GameState player name too
				if p := t.State.FindPlayer(slot.ID); p != nil {
					p.Name = playerName
				}
				return slot.ID, nil
			}
		}
	}
	return "", errors.New("mesa llena")
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
