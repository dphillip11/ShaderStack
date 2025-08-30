package handlers

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "strconv"
    "os"
    "sync"
    "strings"

    "github.com/gorilla/mux"
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

// Unified Svelte HTML shell writer (loads from file static/html/shell.html)
func writeSveltePage(w http.ResponseWriter, auth models.AuthenticationInfo, page string, inlineJS string) {
    shellOnce.Do(loadShell)
    if shellErr != nil {
        http.Error(w, "Shell template missing", http.StatusInternalServerError)
        return
    }
    // Build JSON auth payload properly
    authPayload, _ := json.Marshal(map[string]interface{}{
        "isAuthenticated": auth.IsAuthenticated,
        "username":        auth.Username,
        "user_id":         auth.UserID,
    })
    
    html := strings.ReplaceAll(shellHTML, "window.__AUTH__=__AUTH__", "window.__AUTH__="+string(authPayload))
    html = strings.ReplaceAll(html, "window.__PAGE__=__PAGE__", "window.__PAGE__=\""+page+"\"")
    html = strings.ReplaceAll(html, "__INLINE__", inlineJS)
    w.Header().Set("Content-Type", "text/html; charset=utf-8")
    w.Write([]byte(html))
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

func RenderBrowse(w http.ResponseWriter, r *http.Request) {
    writeSveltePage(w, getAuthInfo(r), "browse", "")
}

func RenderMy(w http.ResponseWriter, r *http.Request) {
    authInfo := getAuthInfo(r)
    if !authInfo.IsAuthenticated {
        http.Redirect(w, r, "/", http.StatusSeeOther)
        return
    }
    
    // Get user's shaders using SearchShaders with UserID filter
    searchParams := models.SearchParams{
        UserID: authInfo.UserID,
    }
    userShaders := data.GetRepository().SearchShaders(searchParams)
    
    // Create inline JS to inject user's shaders data
    shadersData, _ := json.Marshal(map[string]interface{}{
        "shaders": userShaders,
        "filter": "my",
        "title": "My Shaders",
    })
    inline := fmt.Sprintf("window.myShaders=%s;", shadersData)
    
    writeSveltePage(w, authInfo, "browse", inline)
}

func RenderEditor(w http.ResponseWriter, r *http.Request) {
    authInfo := getAuthInfo(r)
    vars := mux.Vars(r)
    id := vars["id"]
    var shaderData interface{}
    if id != "" && id != "new" {
        if shaderID, err := strconv.Atoi(id); err == nil {
            if s := data.GetRepository().GetShaderByID(shaderID); s != nil { shaderData = s }
        }
    }
    if shaderData == nil {
        shaderData = map[string]interface{}{
            "id": nil,
            "name": "New Shader",
            "shader_scripts": []map[string]interface{}{
                {"id": 0, "code": "@fragment\nfn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {\n    let uv = fragCoord.xy / vec2<f32>(512.0, 512.0);\n    return vec4<f32>(uv, 0.5, 1.0);\n}", "buffer": map[string]interface{}{"format": "rgba8unorm", "width": 512, "height": 512}},
            },
            "tags": []interface{}{},
        }
    }
    jsonBytes, _ := json.Marshal(shaderData)
    inline := fmt.Sprintf("window.shaderData=%s;", jsonBytes)
    writeSveltePage(w, authInfo, "editor", inline)
}
