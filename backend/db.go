package main

import (
	"context"
	"fmt"
	"net"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type dbStore struct {
	pool *pgxpool.Pool
}

func envBool(name string) bool {
	v := strings.TrimSpace(os.Getenv(name))
	v = strings.ToLower(v)
	return v == "1" || v == "true" || v == "yes" || v == "on"
}

func newDBStore(ctx context.Context) (*dbStore, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_URL not set")
	}

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to parse DATABASE_URL: %w", err)
	}
	cfg.MaxConns = 8
	cfg.MinConns = 0
	cfg.MaxConnLifetime = 30 * time.Minute
	cfg.MaxConnIdleTime = 5 * time.Minute

	// Some hosts/environments (e.g. Railway/Render) don't have IPv6 egress.
	// Supabase free-tier direct DB hostname may be IPv6-only, so optionally force IPv4 resolution/dialing.
	// On Fly.io (IPv6-capable), leave this disabled.
	if envBool("DB_FORCE_IPV4") {
		dialer := &net.Dialer{Timeout: 10 * time.Second, KeepAlive: 30 * time.Second}
		cfg.ConnConfig.LookupFunc = func(ctx context.Context, host string) ([]string, error) {
			host = strings.TrimSpace(host)
			if ip := net.ParseIP(host); ip != nil {
				if ip4 := ip.To4(); ip4 != nil {
					return []string{ip4.String()}, nil
				}
				return nil, fmt.Errorf("ipv6 is not supported in this runtime (host=%s)", host)
			}

			ips, err := net.DefaultResolver.LookupIP(ctx, "ip4", host)
			if err != nil {
				return nil, err
			}
			out := make([]string, 0, len(ips))
			for _, ip := range ips {
				if ip4 := ip.To4(); ip4 != nil {
					out = append(out, ip4.String())
				}
			}
			if len(out) == 0 {
				return nil, fmt.Errorf("no ipv4 addresses found for host=%s", host)
			}
			return out, nil
		}
		cfg.ConnConfig.DialFunc = func(ctx context.Context, _ string, addr string) (net.Conn, error) {
			return dialer.DialContext(ctx, "tcp4", addr)
		}
	}

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create db pool: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	return &dbStore{pool: pool}, nil
}

func (s *dbStore) Close() {
	if s != nil && s.pool != nil {
		s.pool.Close()
	}
}
