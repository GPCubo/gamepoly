package store

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"gamepolyweb/backend/internal/game"

	"github.com/redis/go-redis/v9"
)

const (
	tableStateTTL = 2 * time.Hour
	sessionTTL    = 1 * time.Hour
)

type RedisStore struct {
	client *redis.Client
}

func NewRedisStore(addr, password string, db int) *RedisStore {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})
	return &RedisStore{client: rdb}
}

// Ping checks connectivity.
func (s *RedisStore) Ping(ctx context.Context) error {
	return s.client.Ping(ctx).Err()
}

// SaveTableState serializes and stores the game state.
func (s *RedisStore) SaveTableState(ctx context.Context, tableID string, gs *game.GameState) error {
	data, err := json.Marshal(gs)
	if err != nil {
		return fmt.Errorf("marshal state: %w", err)
	}
	key := fmt.Sprintf("table:%s:state", tableID)
	return s.client.Set(ctx, key, data, tableStateTTL).Err()
}

// LoadTableState retrieves a game state from Redis.
func (s *RedisStore) LoadTableState(ctx context.Context, tableID string) (*game.GameState, error) {
	key := fmt.Sprintf("table:%s:state", tableID)
	data, err := s.client.Get(ctx, key).Bytes()
	if err != nil {
		return nil, err
	}
	var gs game.GameState
	if err := json.Unmarshal(data, &gs); err != nil {
		return nil, fmt.Errorf("unmarshal state: %w", err)
	}
	return &gs, nil
}

// DeleteTableState removes a game state from Redis.
func (s *RedisStore) DeleteTableState(ctx context.Context, tableID string) error {
	key := fmt.Sprintf("table:%s:state", tableID)
	return s.client.Del(ctx, key).Err()
}

// Session represents a player session stored in Redis.
type Session struct {
	PlayerID       string `json:"playerId"`
	TableID        string `json:"tableId"`
	ServerInstance string `json:"serverInstance"`
}

// SaveSession stores a player session.
func (s *RedisStore) SaveSession(ctx context.Context, token string, session Session) error {
	data, err := json.Marshal(session)
	if err != nil {
		return err
	}
	key := fmt.Sprintf("session:%s", token)
	return s.client.Set(ctx, key, data, sessionTTL).Err()
}

// GetSession retrieves a player session.
func (s *RedisStore) GetSession(ctx context.Context, token string) (*Session, error) {
	key := fmt.Sprintf("session:%s", token)
	data, err := s.client.Get(ctx, key).Bytes()
	if err != nil {
		return nil, err
	}
	var session Session
	if err := json.Unmarshal(data, &session); err != nil {
		return nil, err
	}
	return &session, nil
}

// DeleteSession removes a session.
func (s *RedisStore) DeleteSession(ctx context.Context, token string) error {
	key := fmt.Sprintf("session:%s", token)
	return s.client.Del(ctx, key).Err()
}

// AddToLobby adds a table to the open lobby sorted set.
func (s *RedisStore) AddToLobby(ctx context.Context, tableID string) error {
	score := float64(time.Now().Unix())
	return s.client.ZAdd(ctx, "lobby:open", redis.Z{Score: score, Member: tableID}).Err()
}

// RemoveFromLobby removes a table from the lobby.
func (s *RedisStore) RemoveFromLobby(ctx context.Context, tableID string) error {
	return s.client.ZRem(ctx, "lobby:open", tableID).Err()
}

// ListLobby returns up to `limit` open table IDs ordered by creation time.
func (s *RedisStore) ListLobby(ctx context.Context, limit int64) ([]string, error) {
	return s.client.ZRange(ctx, "lobby:open", 0, limit-1).Result()
}

// SetHeartbeat renews a player's heartbeat.
func (s *RedisStore) SetHeartbeat(ctx context.Context, playerID string) error {
	key := fmt.Sprintf("player:%s:heartbeat", playerID)
	return s.client.Set(ctx, key, 1, 15*time.Second).Err()
}

// CheckHeartbeat returns true if the player is still alive.
func (s *RedisStore) CheckHeartbeat(ctx context.Context, playerID string) bool {
	key := fmt.Sprintf("player:%s:heartbeat", playerID)
	err := s.client.Get(ctx, key).Err()
	return err == nil
}
