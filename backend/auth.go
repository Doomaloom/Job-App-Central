package main

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type ctxKey string

const ctxUserID ctxKey = "userID"

type jwtVerifier struct {
	jwksURL string
	issuer  string
	aud     string
	apiKey  string

	mu       sync.RWMutex
	keysByID map[string]any
	fetched  time.Time
}

func newJWTVerifierFromEnv() (*jwtVerifier, error) {
	supabaseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("SUPABASE_URL")), "/")
	if supabaseURL == "" {
		return nil, fmt.Errorf("SUPABASE_URL not set")
	}

	apiKey := strings.TrimSpace(os.Getenv("SUPABASE_ANON_KEY"))
	if apiKey == "" {
		apiKey = strings.TrimSpace(os.Getenv("SUPABASE_PUBLISHABLE_DEFAULT_KEY"))
	}
	if apiKey == "" {
		apiKey = strings.TrimSpace(os.Getenv("SUPABASE_API_KEY"))
	}
	if apiKey == "" {
		return nil, fmt.Errorf("SUPABASE_ANON_KEY not set (required to fetch JWKS)")
	}

	issuer := strings.TrimSpace(os.Getenv("SUPABASE_JWT_ISSUER"))
	if issuer == "" {
		issuer = supabaseURL + "/auth/v1"
	}

	aud := strings.TrimSpace(os.Getenv("SUPABASE_JWT_AUD"))
	if aud == "" {
		aud = "authenticated"
	}

	return &jwtVerifier{
		jwksURL:  supabaseURL + "/auth/v1/.well-known/jwks.json",
		issuer:   issuer,
		aud:      aud,
		apiKey:   apiKey,
		keysByID: map[string]any{},
	}, nil
}

func (v *jwtVerifier) VerifyAndGetUserID(ctx context.Context, tokenString string) (string, error) {
	tokenString = strings.TrimSpace(tokenString)
	if tokenString == "" {
		return "", fmt.Errorf("missing token")
	}

	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{"RS256", "ES256", "ES384", "ES512"}),
		jwt.WithAudience(v.aud),
		jwt.WithIssuer(v.issuer),
	)

	claims := &jwt.RegisteredClaims{}
	token, err := parser.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		kid, _ := t.Header["kid"].(string)
		if kid == "" {
			return nil, fmt.Errorf("missing kid in token header")
		}

		key, err := v.getKey(ctx, kid)
		if err != nil {
			return nil, err
		}
		return key, nil
	})
	if err != nil {
		return "", err
	}
	if !token.Valid {
		return "", fmt.Errorf("invalid token")
	}

	userID := strings.TrimSpace(claims.Subject)
	if userID == "" {
		return "", fmt.Errorf("missing sub claim")
	}
	return userID, nil
}

func (v *jwtVerifier) getKey(ctx context.Context, kid string) (any, error) {
	v.mu.RLock()
	key := v.keysByID[kid]
	fetched := v.fetched
	v.mu.RUnlock()

	// Cache keys for 1 hour.
	if key != nil && time.Since(fetched) < time.Hour {
		return key, nil
	}

	if err := v.refreshKeys(ctx); err != nil {
		// If refresh fails but we have a key, use it.
		if key != nil {
			return key, nil
		}
		return nil, err
	}

	v.mu.RLock()
	defer v.mu.RUnlock()
	key = v.keysByID[kid]
	if key == nil {
		return nil, fmt.Errorf("no jwk found for kid=%s", kid)
	}
	return key, nil
}

func (v *jwtVerifier) refreshKeys(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.jwksURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("apikey", v.apiKey)
	req.Header.Set("Authorization", "Bearer "+v.apiKey)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch jwks: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("jwks fetch failed: status=%d", resp.StatusCode)
	}

	var jwks struct {
		Keys []struct {
			Kty string `json:"kty"`
			Kid string `json:"kid"`
			N   string `json:"n"`
			E   string `json:"e"`
			Crv string `json:"crv"`
			X   string `json:"x"`
			Y   string `json:"y"`
		} `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("failed to decode jwks: %w", err)
	}

	next := map[string]any{}
	for _, k := range jwks.Keys {
		if strings.TrimSpace(k.Kid) == "" {
			continue
		}
		pub, err := jwkToPublicKey(k.Kty, k.N, k.E, k.Crv, k.X, k.Y)
		if err != nil {
			continue
		}
		next[k.Kid] = pub
	}
	if len(next) == 0 {
		return fmt.Errorf("no usable keys found in jwks")
	}

	v.mu.Lock()
	v.keysByID = next
	v.fetched = time.Now()
	v.mu.Unlock()
	return nil
}

func jwkToPublicKey(kty, nB64URL, eB64URL, crv, xB64URL, yB64URL string) (any, error) {
	switch strings.TrimSpace(kty) {
	case "RSA":
		nb, err := base64.RawURLEncoding.DecodeString(nB64URL)
		if err != nil {
			return nil, err
		}
		eb, err := base64.RawURLEncoding.DecodeString(eB64URL)
		if err != nil {
			return nil, err
		}

		n := new(big.Int).SetBytes(nb)
		e := 0
		for _, b := range eb {
			e = e<<8 + int(b)
		}
		if e == 0 {
			return nil, fmt.Errorf("invalid exponent")
		}
		return &rsa.PublicKey{N: n, E: e}, nil

	case "EC":
		curve := curveFor(crv)
		if curve == nil {
			return nil, fmt.Errorf("unsupported curve: %s", crv)
		}
		xb, err := base64.RawURLEncoding.DecodeString(xB64URL)
		if err != nil {
			return nil, err
		}
		yb, err := base64.RawURLEncoding.DecodeString(yB64URL)
		if err != nil {
			return nil, err
		}
		x := new(big.Int).SetBytes(xb)
		y := new(big.Int).SetBytes(yb)
		if !curve.IsOnCurve(x, y) {
			return nil, fmt.Errorf("ec key not on curve")
		}
		return &ecdsa.PublicKey{Curve: curve, X: x, Y: y}, nil

	default:
		return nil, fmt.Errorf("unsupported kty: %s", kty)
	}
}

func curveFor(crv string) elliptic.Curve {
	switch strings.TrimSpace(crv) {
	case "P-256":
		return elliptic.P256()
	case "P-384":
		return elliptic.P384()
	case "P-521":
		return elliptic.P521()
	default:
		return nil
	}
}

func requireAuth(verifier *jwtVerifier, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") {
			http.Error(w, "missing bearer token", http.StatusUnauthorized)
			return
		}
		token := strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID, err := verifier.VerifyAndGetUserID(ctx, token)
		if err != nil {
			http.Error(w, "unauthorized: "+err.Error(), http.StatusUnauthorized)
			return
		}

		next(w, r.WithContext(context.WithValue(r.Context(), ctxUserID, userID)))
	}
}

func userIDFromRequest(r *http.Request) (string, error) {
	v := r.Context().Value(ctxUserID)
	userID, _ := v.(string)
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return "", fmt.Errorf("missing user id in context")
	}
	return userID, nil
}
