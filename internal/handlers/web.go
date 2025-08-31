package handlers

import (
    "context"
    "fmt"
    "net/http"
    "os"
    "sync"
    "go-server/internal/data"
    "go-server/internal/models"
)

// AuthMiddleware populates auth info (non-blocking)
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        authInfo := models.AuthenticationInfo{IsAuthenticated: false}
        if cookie, err := r.Cookie("session_token"); err == nil {
            sessionsMu.Lock()
            session, exists := sessions[cookie.Value]
            sessionsMu.Unlock()
            if exists {
                if user := data.GetRepository().GetUserByID(session.UserID); user != nil {
                    authInfo.IsAuthenticated = true
                    authInfo.UserID = session.UserID
                    authInfo.Username = user.Username
                    r.Header.Set("X-User-ID", fmt.Sprintf("%d", user.ID))
                    r.Header.Set("X-Username", user.Username)
                }
            }
        }
        ctx := context.WithValue(r.Context(), authInfoKey, authInfo)
        next(w, r.WithContext(ctx))
    }
}

type contextKey string
const authInfoKey = contextKey("authInfo")

var (
    shellOnce sync.Once
    shellHTML string
    shellErr  error
)

func loadShell() {
    bytes, err := os.ReadFile("static/html/shell.html")
    if err != nil { shellErr = err; return }
    shellHTML = string(bytes)
}

// Unified SPA handler - serves the same Svelte app for all routes
func RenderSPA(w http.ResponseWriter, r *http.Request) {
    shellOnce.Do(loadShell)
    if shellErr != nil {
        http.Error(w, "Shell template missing", http.StatusInternalServerError)
        return
    }
    
    w.Header().Set("Content-Type", "text/html; charset=utf-8")
    w.Write([]byte(shellHTML))
}

// getAuthInfo retrieves auth info from context or session cookie
func getAuthInfo(r *http.Request) models.AuthenticationInfo {
    if val, ok := r.Context().Value(authInfoKey).(models.AuthenticationInfo); ok {
        return val
    }
    cookie, err := r.Cookie("session_token")
    if err != nil { return models.AuthenticationInfo{IsAuthenticated: false} }
    session, exists := getSessionByToken(cookie.Value)
    if !exists { return models.AuthenticationInfo{IsAuthenticated: false} }
    user := data.GetRepository().GetUserByID(session.UserID)
    if user == nil { return models.AuthenticationInfo{IsAuthenticated: false} }
    return models.AuthenticationInfo{IsAuthenticated: true, Username: user.Username, UserID: user.ID}
}
