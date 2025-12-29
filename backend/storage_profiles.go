package main

import (
	"context"
	"encoding/json"
)

func (s *dbStore) GetProfile(ctx context.Context, userID string) (json.RawMessage, error) {
	var raw []byte
	if err := s.pool.QueryRow(ctx, `select profile from profiles where user_id = $1::uuid`, userID).Scan(&raw); err != nil {
		return nil, err
	}
	return json.RawMessage(raw), nil
}

func (s *dbStore) UpsertProfile(ctx context.Context, userID string, profile json.RawMessage) error {
	_, err := s.pool.Exec(ctx, `
		insert into profiles (user_id, profile)
		values ($1::uuid, $2::jsonb)
		on conflict (user_id) do update set profile = excluded.profile, updated_at = now()
	`, userID, string(profile))
	return err
}
