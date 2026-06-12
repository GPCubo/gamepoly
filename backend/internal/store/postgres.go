package store

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresStore wraps a pgxpool connection pool.
type PostgresStore struct {
	Pool *pgxpool.Pool
}

// NewPostgresStoreFromEnv creates a pool from environment variables.
// Returns (nil, nil) when ENABLE_FINISHED_GAME_PERSISTENCE != "true".
func NewPostgresStoreFromEnv(ctx context.Context) (*PostgresStore, error) {
	if os.Getenv("ENABLE_FINISHED_GAME_PERSISTENCE") != "true" {
		return nil, nil
	}

	dsn := os.Getenv("POSTGRES_DSN")
	if dsn == "" {
		return nil, fmt.Errorf("POSTGRES_DSN not set but ENABLE_FINISHED_GAME_PERSISTENCE=true")
	}

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("invalid POSTGRES_DSN: %w", err)
	}

	if v := os.Getenv("POSTGRES_MAX_CONNS"); v != "" {
		if n, e := strconv.Atoi(v); e == nil {
			cfg.MaxConns = int32(n)
		}
	}
	if v := os.Getenv("POSTGRES_MIN_CONNS"); v != "" {
		if n, e := strconv.Atoi(v); e == nil {
			cfg.MinConns = int32(n)
		}
	}
	if v := os.Getenv("POSTGRES_CONNECT_TIMEOUT_SECONDS"); v != "" {
		if n, e := strconv.Atoi(v); e == nil {
			cfg.ConnConfig.ConnectTimeout = time.Duration(n) * time.Second
		}
	}

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("pgxpool.NewWithConfig: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("pgxpool ping: %w", err)
	}

	return &PostgresStore{Pool: pool}, nil
}

// Close shuts down the connection pool.
func (s *PostgresStore) Close() {
	if s != nil && s.Pool != nil {
		s.Pool.Close()
	}
}
