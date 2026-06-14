package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"gamepolyweb/backend/internal/api"
	"gamepolyweb/backend/internal/config"
	"gamepolyweb/backend/internal/game"
	"gamepolyweb/backend/internal/store"
	"gamepolyweb/backend/internal/table"
)

// Compile-time check: store.FinishedGameRepository implements table.FinishedGameRepo.
var _ table.FinishedGameRepo = (*store.FinishedGameRepository)(nil)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}
	redisPassword := os.Getenv("REDIS_PASSWORD")

	// Redis store
	rs := store.NewRedisStore(redisAddr, redisPassword, 0)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := rs.Ping(ctx); err != nil {
		log.Printf("⚠  Redis not reachable (%v) — state persistence disabled", err)
	} else {
		log.Printf("✓ Redis connected at %s", redisAddr)
	}

	// PostgreSQL (optional — enabled by ENABLE_FINISHED_GAME_PERSISTENCE=true)
	pgCtx, pgCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer pgCancel()
	pg, err := store.NewPostgresStoreFromEnv(pgCtx)
	if err != nil {
		log.Printf("⚠  Postgres not available (%v) — finished game persistence disabled", err)
	} else if pg != nil {
		log.Printf("✓ Postgres connected")
		if err := pg.RunMigrations(pgCtx); err != nil {
			log.Printf("⚠  Postgres migrations failed: %v", err)
			pg.Close()
			pg = nil
		} else {
			log.Printf("✓ Postgres migrations OK")
			defer pg.Close()
		}
	}

	var finishedGameRepo table.FinishedGameRepo
	var clientErrorRepo *store.ClientErrorRepository
	if pg != nil {
		finishedGameRepo = store.NewFinishedGameRepository(pg)
		clientErrorRepo = store.NewClientErrorRepository(pg)
	}

	// Board registry — load from DB, fall back to hardcoded config
	boardReg := game.NewBoardRegistry()
	if pg != nil {
		boardRepo := store.NewBoardRepository(pg)
		regCtx, regCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer regCancel()
		if err := loadBoardsIntoRegistry(regCtx, boardRepo, boardReg); err != nil {
			log.Printf("⚠  Board registry load failed (%v) — using hardcoded config", err)
			boardReg.UseHardcoded()
		}
	}
	if boardReg.IsEmpty() {
		boardReg.UseHardcoded()
	}
	log.Printf("✓ Board registry ready")

	// Table manager
	mgr := table.NewManager(finishedGameRepo, boardReg)

	// HTTP router
	router := api.NewRouter(mgr, rs, boardReg)
	if clientErrorRepo != nil {
		router.SetClientErrorRepo(clientErrorRepo)
	}
	mux := http.NewServeMux()
	router.RegisterRoutes(mux)

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 0, // WebSocket connections must not timeout
		IdleTimeout:  120 * time.Second,
	}

	// Graceful shutdown
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("🎲 GamePoly backend listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-done
	log.Println("shutting down...")
	shutCtx, shutCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutCancel()
	if err := srv.Shutdown(shutCtx); err != nil {
		log.Printf("shutdown error: %v", err)
	}
	log.Println("bye")
}

// loadBoardsIntoRegistry fetches all visible boards from the DB and registers
// them in the registry. Converts store.BoardTile → config.BoardTile in-place.
func loadBoardsIntoRegistry(ctx context.Context, repo *store.BoardRepository, reg *game.BoardRegistry) error {
	boards, err := repo.GetAllVisibleBoards(ctx)
	if err != nil {
		return err
	}
	if len(boards) == 0 {
		return nil
	}
	for _, b := range boards {
		tiles, err := repo.GetBoardTiles(ctx, b.ID)
		if err != nil {
			return err
		}
		configTiles := make([]config.BoardTile, 0, len(tiles))
		for _, t := range tiles {
			color := ""
			if t.ColorHex != nil {
				color = *t.ColorHex
			}
			configTiles = append(configTiles, config.BoardTile{
				Index:     t.TileIndex,
				Type:      config.TileType(t.TileType),
				Group:     t.TileGroup,
				Name:      t.Name,
				ShortName: t.ShortName,
				Price:     t.Price,
				Color:     color,
			})
		}
		// Load cards from DB
		dbCards, err := repo.GetBoardCards(ctx, b.ID)
		if err != nil {
			return err
		}
		var chanceCards, communityCards []config.GameCard
		for _, c := range dbCards {
			gc := config.GameCard{
				ID:        c.CardID,
				Group:     c.CardGroup,
				Text:      c.Text,
				Action:    config.CardActionType(c.Action),
				Amount:    c.Amount,
				TileIndex: c.TileIndex,
			}
			if c.CardGroup == "chance" {
				chanceCards = append(chanceCards, gc)
			} else {
				communityCards = append(communityCards, gc)
			}
		}

		reg.Register(b.Slug, b.Locale, b.DisplayName, b.GLBPath, configTiles, chanceCards, communityCards)
		log.Printf("[board] registered '%s' (%d tiles, %d cards)", b.Slug, len(configTiles), len(dbCards))
	}
	return nil
}
