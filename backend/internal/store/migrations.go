package store

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"path/filepath"
	"sort"
	"strings"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

// RunMigrations applies all pending SQL migrations in order.
// It is idempotent: already-applied versions are skipped.
func (s *PostgresStore) RunMigrations(ctx context.Context) error {
	_, err := s.Pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version    VARCHAR(64) PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	entries, err := fs.ReadDir(migrationFiles, "migrations")
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}

	var names []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)

	for _, name := range names {
		version := strings.TrimSuffix(name, ".sql")

		var exists bool
		if err := s.Pool.QueryRow(ctx,
			"SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version=$1)", version,
		).Scan(&exists); err != nil {
			return fmt.Errorf("check migration %s: %w", version, err)
		}
		if exists {
			continue
		}

		sql, err := fs.ReadFile(migrationFiles, filepath.Join("migrations", name))
		if err != nil {
			return fmt.Errorf("read migration file %s: %w", name, err)
		}

		if _, err := s.Pool.Exec(ctx, string(sql)); err != nil {
			return fmt.Errorf("apply migration %s: %w", name, err)
		}

		if _, err := s.Pool.Exec(ctx,
			"INSERT INTO schema_migrations(version) VALUES($1) ON CONFLICT DO NOTHING", version,
		); err != nil {
			return fmt.Errorf("mark migration %s: %w", name, err)
		}

		log.Printf("[postgres] migration applied: %s", name)
	}
	return nil
}
