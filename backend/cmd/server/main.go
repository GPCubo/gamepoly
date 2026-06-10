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
	"gamepolyweb/backend/internal/store"
	"gamepolyweb/backend/internal/table"
)

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

	// Table manager
	mgr := table.NewManager()

	// HTTP router
	router := api.NewRouter(mgr, rs)
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
