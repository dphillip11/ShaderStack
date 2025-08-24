package handlers

import (
    "crypto/rand"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "net/http"
    "strconv"
    "sync"
    "time"
    "github.com/gorilla/mux"

    "go-server/internal/models"
    "go-server/internal/data"
)

var (
    // Session storage
    sessions   = make(map[string]models.Session)
    sessionsMu sync.Mutex
)

// Helper function to get session by token (used by web.go)
func getSessionByToken(token string) (models.Session, bool) {
    sessionsMu.Lock()
    defer sessionsMu.Unlock()
    session, exists := sessions[token]
    return session, exists
}

// Login handles POST requests for user authentication
func Login(w http.ResponseWriter, r *http.Request) {
    var loginReq models.LoginRequest
    if err := json.NewDecoder(r.Body).Decode(&loginReq); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    // Find user using repository
    user := data.GetRepository().GetUserByUsername(loginReq.Username)
    if user == nil || user.Password != loginReq.Password {
        http.Error(w, "Invalid credentials", http.StatusUnauthorized)
        return
    }

    // Generate session token
    token := generateToken()
    session := models.Session{
        Token:  token,
        UserID: user.ID,
    }

    sessionsMu.Lock()
    sessions[token] = session
    sessionsMu.Unlock()

    // Set cookie
    http.SetCookie(w, &http.Cookie{
        Name:     "session_token",
        Value:    token,
        Path:     "/",
        HttpOnly: true,
        Secure:   false, // Set to true in production with HTTPS
        SameSite: http.SameSiteLaxMode,
        Expires:  time.Now().Add(24 * time.Hour),
    })

    w.Header().Set("Content-Type", "application/json")
    response := map[string]interface{}{
        "message":  "Login successful",
        "user_id":  user.ID,
        "username": user.Username,
    }
    json.NewEncoder(w).Encode(response)
}

// Logout handles POST requests for user logout
func Logout(w http.ResponseWriter, r *http.Request) {
    cookie, err := r.Cookie("session_token")
    if err != nil {
        http.Redirect(w, r, "/", http.StatusSeeOther)
        return
    }

    sessionsMu.Lock()
    delete(sessions, cookie.Value)
    sessionsMu.Unlock()

    // Clear cookie
    http.SetCookie(w, &http.Cookie{
        Name:     "session_token",
        Value:    "",
        Path:     "/",
        HttpOnly: true,
        MaxAge:   -1,
    })

    // Redirect to homepage after logout
    http.Redirect(w, r, "/", http.StatusSeeOther)
}

// AuthMiddleware checks if user is authenticated
func BlockingAuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        cookie, err := r.Cookie("session_token")
        if (err != nil) {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }

        sessionsMu.Lock()
        session, exists := sessions[cookie.Value]
        sessionsMu.Unlock()

        if (!exists) {
            http.Error(w, "Invalid session", http.StatusUnauthorized)
            return
        }

        // Find the user to get username
        user := data.GetRepository().GetUserByID(session.UserID)
        if user == nil {
            http.Error(w, "User not found", http.StatusUnauthorized)
            return
        }

        // Add user information to request headers
        r.Header.Set("X-User-ID", fmt.Sprintf("%d", session.UserID))
        r.Header.Set("X-Username", user.Username)
        next(w, r)
    }
}

// generateToken creates a random session token
func generateToken() string {
    bytes := make([]byte, 32)
    rand.Read(bytes)
    return hex.EncodeToString(bytes)
}

// Shader API handlers
func GetShaders(w http.ResponseWriter, r *http.Request) {
    repo := data.GetRepository()
    params := models.SearchParams{} // Get all shaders
    shaders := repo.SearchShaders(params)
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(shaders)
}

func GetTags(w http.ResponseWriter, r *http.Request) {
    repo := data.GetRepository()
    tags := repo.GetAllTags()
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(tags)
}

func GetShader(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        http.Error(w, "Invalid shader ID", http.StatusBadRequest)
        return
    }
    
    shader := data.GetRepository().GetShaderByID(id)
    if shader == nil {
        http.Error(w, "Shader not found", http.StatusNotFound)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(shader)
}

func UpdateShader(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        http.Error(w, "Invalid shader ID", http.StatusBadRequest)
        return
    }
    
    // Get user ID from authentication middleware
    userID, err := strconv.Atoi(r.Header.Get("X-User-ID"))
    if err != nil {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }
    
    // Use the existing Shader model directly
    var shader models.Shader
    if err := json.NewDecoder(r.Body).Decode(&shader); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }
    
    // Set the ID and UserID from the request
    shader.ID = id
    shader.UserID = userID
    
    updatedShader, err := data.GetRepository().UpdateShader(id, shader)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "id":      updatedShader.ID,
        "message": "Shader updated successfully",
    })
}

func DeleteShader(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        http.Error(w, "Invalid shader ID", http.StatusBadRequest)
        return
    }
    
    if err := data.GetRepository().DeleteShader(id); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    response := map[string]string{"message": "Shader deleted successfully"}
    json.NewEncoder(w).Encode(response)
}

func CreateShaderAPI(w http.ResponseWriter, r *http.Request) {
    userID, err := strconv.Atoi(r.Header.Get("X-User-ID"))
    if err != nil {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }
    
    // Use the existing Shader model directly
    var shader models.Shader
    if err := json.NewDecoder(r.Body).Decode(&shader); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }
    
    // Set the UserID from authentication
    shader.UserID = userID
    
    createdShader, err := data.GetRepository().CreateShader(shader)
    if err != nil {
        http.Error(w, "Failed to create shader: "+err.Error(), http.StatusInternalServerError)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "id":      createdShader.ID,
        "message": "Shader created successfully",
    })

    http.Redirect(w, r, fmt.Sprintf("i/%d", createdShader.ID), http.StatusSeeOther)
}