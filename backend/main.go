package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"html/template"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret []byte

func main() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "dev-secret-change" // dev fallback
	}
	jwtSecret = []byte(secret)

	store := NewInMemoryStore()

	// persistence file path (env OVERRIDE: DATA_FILE)
	dataFile := os.Getenv("DATA_FILE")
	if dataFile == "" {
		dataFile = "data.json"
	}
	// attempt restore
	if b, err := os.ReadFile(dataFile); err == nil && len(b) > 0 {
		var p PersistedData
		if json.Unmarshal(b, &p) == nil {
			store.Restore(&p)
			log.Printf("restored %d users / %d shaders", len(p.Users), len(p.Shaders))
		}
	}
	// register onChange persistence
	store.SetOnChange(func() {
		p := store.Snapshot()
		buf, err := json.MarshalIndent(p, "", "  ")
		if err != nil {
			return
		}
		// atomic write
		tmp := dataFile + ".tmp"
		if err = os.WriteFile(tmp, buf, 0o600); err == nil {
			_ = os.Rename(tmp, dataFile)
		}
	})

	// parse templates with helper funcs for pagination
	funcs := template.FuncMap{
		"add": func(a, b int) int { return a + b },
		"sub": func(a, b int) int { return a - b },
		"until": func(n int) []int { out := make([]int, n); for i := 0; i < n; i++ { out[i] = i }; return out },
	}
	tmpl := template.Must(template.New("").Funcs(funcs).ParseGlob("templates/*.html"))

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	// Remove CORS for consolidated deployment (same origin)
	
	// Serve built frontend assets from local dist/assets directory
	assetDir := "dist/assets"
	log.Printf("serving assets from %s", assetDir)
	r.Handle("/assets/*", http.StripPrefix("/assets/", http.FileServer(http.Dir(assetDir))))

	// Root loads editor SPA via Go template (consolidated)
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		if err := tmpl.ExecuteTemplate(w, "editor.html", nil); err != nil {
			log.Printf("template error: %v", err)
			w.WriteHeader(500)
			_, _ = w.Write([]byte("template error"))
		}
	})

	// Page routes
	r.Get("/login", func(w http.ResponseWriter, r *http.Request) {
		_ = tmpl.ExecuteTemplate(w, "login.html", map[string]any{"Error": r.URL.Query().Get("err")})
	})
	r.Post("/login", func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			http.Redirect(w, r, "/login?err=bad+form", 302)
			return
		}
		username := r.Form.Get("username")
		password := r.Form.Get("password")
		u, err := store.FindUserByUsername(username)
		if err != nil || bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)) != nil {
			http.Redirect(w, r, "/login?err=invalid+credentials", 302)
			return
		}
		tok := newToken(u)
		setAuthCookie(w, tok)
		http.Redirect(w, r, "/my", 302)
	})
	// simple registration via API call suggestion inside page (no SSR form yet)

	r.Get("/shaders", func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query().Get("q")
		pageStr := r.URL.Query().Get("page")
		page, _ := strconv.Atoi(pageStr)
		if page < 0 {
			page = 0
		}
		limit := 20
		offset := page * limit
		items, total := store.SearchShaders(q, limit, offset)
		pages := (total + limit - 1) / limit
		_ = tmpl.ExecuteTemplate(w, "shaders.html", map[string]any{
			"Shaders": items,
			"Query":   q,
			"Page":    page,
			"Pages":   pages,
			"Total":   total,
			"Limit":   limit,
		})
	})

	r.Get("/my", func(w http.ResponseWriter, r *http.Request) {
		user, _ := userFromCookie(r)
		if user == nil {
			http.Redirect(w, r, "/login", 302)
			return
		}
		my := store.ListShadersByUser(user.ID)
		_ = tmpl.ExecuteTemplate(w, "my_shaders.html", map[string]any{"User": user, "Shaders": my})
	})

	api := chi.NewRouter()
	api.Post("/register", func(w http.ResponseWriter, r *http.Request) {
		var req RegisterRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeErr(w, http.StatusBadRequest, "invalid json")
			return
		}
		if strings.TrimSpace(req.Username) == "" || req.Password == "" {
			writeErr(w, http.StatusBadRequest, "missing fields")
			return
		}
		pwHash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		u := &User{ID: newID(), Username: req.Username, PasswordHash: string(pwHash), CreatedAt: time.Now().UTC()}
		if err := store.CreateUser(u); err != nil {
			if errors.Is(err, errUserExists) {
				writeErr(w, http.StatusConflict, "user exists")
				return
			}
			writeErr(w, 500, "server")
			return
		}
		resp := AuthResponse{Token: newToken(u), User: u}
		setAuthCookie(w, resp.Token)
		writeJSON(w, 201, resp)
	})
	api.Post("/login", func(w http.ResponseWriter, r *http.Request) {
		var req LoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeErr(w, 400, "invalid json")
			return
		}
		u, err := store.FindUserByUsername(req.Username)
		if err != nil {
			writeErr(w, 401, "invalid credentials")
			return
		}
		if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)) != nil {
			writeErr(w, 401, "invalid credentials")
			return
		}
		writeJSON(w, 200, AuthResponse{Token: newToken(u), User: u})
		setAuthCookie(w, newToken(u))
	})

	api.Route("/shaders", func(r chi.Router) {
		r.Get("/", func(w http.ResponseWriter, r *http.Request) {
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			if limit <= 0 || limit > 50 {
				limit = 20
			}
			offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
			if offset < 0 {
				offset = 0
			}
			q := r.URL.Query().Get("q")
			items, total := store.SearchShaders(q, limit, offset)
			writeJSON(w, 200, map[string]any{
				"items":  items,
				"total":  total,
				"limit":  limit,
				"offset": offset,
				"query":  q,
			})
		})
		r.Post("/", withAuth(func(w http.ResponseWriter, r *http.Request, u *User) {
			var req CreateShaderRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				writeErr(w, 400, "invalid json")
				return
			}
			sh := &Shader{ID: newID(), OwnerID: u.ID, Title: req.Title, Code: req.Code, Tags: req.Tags}
			if err := store.AddShader(sh); err != nil {
				writeErr(w, 500, "server")
				return
			}
			writeJSON(w, 201, sh)
		}))
		// specific shader
		r.Route("/{shaderID}", func(r chi.Router) {
			r.Get("/", func(w http.ResponseWriter, r *http.Request) {
				id := chi.URLParam(r, "shaderID")
				sh, err := store.GetShader(id)
				if err != nil {
					writeErr(w, 404, "not found")
					return
				}
				writeJSON(w, 200, sh)
			})
			r.Put("/", withAuth(func(w http.ResponseWriter, r *http.Request, u *User) {
				id := chi.URLParam(r, "shaderID")
				var req UpdateShaderRequest
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					writeErr(w, 400, "invalid json")
					return
				}
				sh, err := store.UpdateShader(u.ID, id, func(sh *Shader) error {
					if req.Title != nil {
						sh.Title = *req.Title
					}
					if req.Code != nil {
						sh.Code = *req.Code
					}
					if req.Tags != nil {
						sh.Tags = *req.Tags
					}
					return nil
				})
				if err != nil {
					if errors.Is(err, errShaderNotFound) {
						writeErr(w, 404, "not found")
						return
					}
					if strings.Contains(err.Error(), "forbidden") {
						writeErr(w, 403, "forbidden")
						return
					}
					writeErr(w, 500, "server")
					return
				}
				writeJSON(w, 200, sh)
			}))
		})
	})

	api.Get("/tags", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, store.ListTags())
	})

	api.Get("/users/{username}/shaders", func(w http.ResponseWriter, r *http.Request) {
		username := chi.URLParam(r, "username")
		u, err := store.FindUserByUsername(username)
		if err != nil {
			writeErr(w, 404, "not found")
			return
		}
		writeJSON(w, 200, store.ListShadersByUser(u.ID))
	})

	r.Mount("/api", api)

	addr := ":8080"
	log.Println("backend listening on", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal(err)
	}
}

// helpers

type authedHandler func(w http.ResponseWriter, r *http.Request, user *User)

func withAuth(next authedHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var user *User
		var err error
		// Try header first
		user, err = userFromReqHeader(r)
		if err != nil { // fallback to cookie
			user, err = userFromCookie(r)
		}
		if err != nil || user == nil {
			writeErr(w, 401, "unauthorized")
			return
		}
		next(w, r, user)
	}
}

// split header logic so we can fallback cleanly
func userFromReqHeader(r *http.Request) (*User, error) {
	h := r.Header.Get("Authorization")
	if h == "" { return nil, errors.New("missing") }
	parts := strings.SplitN(h, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return nil, errors.New("bad auth header")
	}
	return parseJWT(parts[1])
}

func parseJWT(tokenStr string) (*User, error) {
	tok, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) { return jwtSecret, nil })
	if err != nil || !tok.Valid { return nil, errors.New("invalid token") }
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok { return nil, errors.New("claims") }
	uid, _ := claims["sub"].(string)
	uname, _ := claims["username"].(string)
	return &User{ID: uid, Username: uname}, nil
}

func newToken(u *User) string {
	claims := jwt.MapClaims{
		"sub":      u.ID,
		"username": u.Username,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, _ := token.SignedString(jwtSecret)
	return s
}

func newID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return strconv.FormatInt(time.Now().UnixNano(), 10)
	}
	return hex.EncodeToString(b)
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func setAuthCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{Name: "auth", Value: token, Path: "/", HttpOnly: true, SameSite: http.SameSiteLaxMode, Expires: time.Now().Add(24 * time.Hour)})
}

func userFromCookie(r *http.Request) (*User, error) {
	c, err := r.Cookie("auth")
	if err != nil {
		return nil, err
	}
	tok, err := jwt.Parse(c.Value, func(t *jwt.Token) (interface{}, error) { return jwtSecret, nil })
	if err != nil || !tok.Valid {
		return nil, errors.New("invalid token")
	}
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("claims")
	}
	uid, _ := claims["sub"].(string)
	uname, _ := claims["username"].(string)
	return &User{ID: uid, Username: uname}, nil
}
