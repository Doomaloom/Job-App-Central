package main

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
)

func handleProfile(w http.ResponseWriter, r *http.Request) {
	userID, err := userIDFromRequest(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	switch r.Method {
	case http.MethodGet:
		raw, err := store.GetProfile(r.Context(), userID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				http.Error(w, "profile not found", http.StatusNotFound)
				return
			}
			http.Error(w, "Failed to fetch profile: "+err.Error(), http.StatusInternalServerError)
			return
		}
		if len(raw) == 0 {
			raw = json.RawMessage(`{}`)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(raw)

	case http.MethodPut:
		var raw json.RawMessage
		dec := json.NewDecoder(r.Body)
		if err := dec.Decode(&raw); err != nil {
			http.Error(w, "invalid JSON body: "+err.Error(), http.StatusBadRequest)
			return
		}
		if len(raw) == 0 {
			raw = json.RawMessage(`{}`)
		}

		if err := store.UpsertProfile(r.Context(), userID, raw); err != nil {
			http.Error(w, "Failed to save profile: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(raw)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

