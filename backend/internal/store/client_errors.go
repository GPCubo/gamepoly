package store

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ClientErrorPayload is the sanitised payload sent by the frontend.
type ClientErrorPayload struct {
	OccurredAt     time.Time              `json:"occurredAt"`
	Environment    string                 `json:"environment"`
	ReleaseVersion string                 `json:"releaseVersion"`
	Source         string                 `json:"source"`
	Severity       string                 `json:"severity"`
	Message        string                 `json:"message"`
	ErrorName      string                 `json:"errorName"`
	Stack          string                 `json:"stack"`
	Route          string                 `json:"route"`
	UserAgent      string                 `json:"userAgent"`
	TableID        string                 `json:"tableId"`
	PlayerIDHash   string                 `json:"playerIdHash"`
	SessionIDHash  string                 `json:"sessionIdHash"`
	EventName      string                 `json:"eventName"`
	Context        map[string]interface{} `json:"context"`
}

// ClientErrorRepository inserts error events into PostgreSQL.
type ClientErrorRepository struct {
	pg *PostgresStore
}

// NewClientErrorRepository wraps a PostgresStore. Returns nil when pg is nil.
func NewClientErrorRepository(pg *PostgresStore) *ClientErrorRepository {
	if pg == nil {
		return nil
	}
	return &ClientErrorRepository{pg: pg}
}

const (
	maxClientMessage = 1000
	maxClientStack   = 12000
)

// Save inserts one error event. Truncates long fields before inserting.
func (r *ClientErrorRepository) Save(ctx context.Context, p ClientErrorPayload) error {
	if r == nil {
		return nil
	}
	if len(p.Message) > maxClientMessage {
		p.Message = p.Message[:maxClientMessage]
	}
	if len(p.Stack) > maxClientStack {
		p.Stack = p.Stack[:maxClientStack]
	}
	if p.Environment == "" {
		p.Environment = "production"
	}
	if p.OccurredAt.IsZero() {
		p.OccurredAt = time.Now()
	}

	ctxJSON, err := json.Marshal(p.Context)
	if err != nil {
		ctxJSON = []byte("{}")
	}

	id := uuid.New().String()
	_, err = r.pg.Pool.Exec(ctx, `
		INSERT INTO client_error_events
			(id, occurred_at, environment, release_version, source, severity,
			 message, error_name, stack, route, user_agent, table_id,
			 player_id_hash, session_id_hash, event_name, context)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
	`, id, p.OccurredAt, p.Environment, nilStr(p.ReleaseVersion),
		p.Source, p.Severity, p.Message, nilStr(p.ErrorName),
		nilStr(p.Stack), nilStr(p.Route), nilStr(p.UserAgent),
		nilStr(p.TableID), nilStr(p.PlayerIDHash), nilStr(p.SessionIDHash),
		nilStr(p.EventName), ctxJSON)
	return err
}
