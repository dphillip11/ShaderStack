package handlers

import (
    "html/template"
    "net/http"
    "strconv"
    "github.com/gorilla/mux"
    "go-server/internal/models"
    "go-server/internal/data"
    "log"
    "context"
    "fmt"
)

type contextKey string

const authInfoKey = contextKey("authInfo")

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        authInfo := models.AuthenticationInfo{IsAuthenticated: false}

        cookie, err := r.Cookie("session_token")
        if err == nil {
            sessionsMu.Lock()
            session, exists := sessions[cookie.Value]
            sessionsMu.Unlock()

            if exists {
                user := data.GetRepository().GetUserByID(session.UserID)
                if user != nil {
                    authInfo.IsAuthenticated = true
                    authInfo.UserID = session.UserID
                    authInfo.Username = user.Username

                    // Optional headers
                    r.Header.Set("X-User-ID", fmt.Sprintf("%d", user.ID))
                    r.Header.Set("X-Username", user.Username)
                }
            }
        }

        // Add authInfo to context and pass to next handler
        ctx := context.WithValue(r.Context(), authInfoKey, authInfo)
        next(w, r.WithContext(ctx))
    }
}
var tmpl *template.Template

func InitTemplates() {
    var err error
    tmpl, err = template.ParseGlob("templates/layouts/*.html")
    if err != nil {
        log.Fatalf("Failed to parse layouts templates: %v", err)
    }

    tmpl, err = tmpl.ParseGlob("templates/components/*.html")
    if err != nil {
        log.Fatalf("Failed to parse components templates: %v", err)
    }

    for _, t := range tmpl.Templates() {
        log.Println("Loaded base template:", t.Name())
    }
}

func loadPage(w http.ResponseWriter, pageFile string, data interface{}) {
    // Clone the base template so we can safely add page-specific definitions
    pageTemplate, err := tmpl.Clone()
    if err != nil {
        http.Error(w, "Template error", http.StatusInternalServerError)
        log.Printf("Template clone error: %v", err)
        return
    }

    // Parse the specific page file into the cloned template
    _, err = pageTemplate.ParseFiles("templates/pages/" + pageFile)
    if err != nil {
        http.Error(w, "Template parsing error", http.StatusInternalServerError)
        log.Printf("Page template error: %v", err)
        return
    }

    // Render the desired template (likely "base.html")
    err = pageTemplate.ExecuteTemplate(w, "base.html", data)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        log.Printf("Execution error: %v", err)
    }
}

// Helper function to get authentication info from request context
func getAuthInfo(r *http.Request) models.AuthenticationInfo {
    // Try to get auth info from context
    if val, ok := r.Context().Value(authInfoKey).(models.AuthenticationInfo); ok {
        return val
    }

    // Fallback: if for some reason context doesn't have it, do the old check
    cookie, err := r.Cookie("session_token")
    if err != nil {
        return models.AuthenticationInfo{
            IsAuthenticated: false,
        }
    }

    session, exists := getSessionByToken(cookie.Value)
    if !exists {
        return models.AuthenticationInfo{
            IsAuthenticated: false,
        }
    }

    user := data.GetRepository().GetUserByID(session.UserID)
    if user == nil {
        return models.AuthenticationInfo{
            IsAuthenticated: false,
        }
    }

    return models.AuthenticationInfo{
        IsAuthenticated: true,
        Username:        user.Username,
        UserID:          user.ID,
    }
}

func RenderBrowse(w http.ResponseWriter, r *http.Request) {
    params := models.SearchParams{}
    params.Name = r.URL.Query().Get("name")
    if pageStr := r.URL.Query().Get("page"); pageStr != "" {
        if page, err := strconv.Atoi(pageStr); err == nil {
            params.Page = page
        }
    }
    params.Tags = r.URL.Query()["tags"]
    params.Username = r.URL.Query().Get("username")

    shaders := data.GetRepository().SearchShaders(params)
    authInfo := getAuthInfo(r)

    showLoginPrompt := r.Context().Value("loginPrompt");

    data := models.BrowsePageData{
        Shaders:     shaders,
        AuthInfo:    authInfo,
        SearchQuery: params,
        ShowLoginPrompt: showLoginPrompt != nil,
    }

    loadPage(w, "browse.html", data);
}

func RenderMy(w http.ResponseWriter, r *http.Request) {
    authInfo := getAuthInfo(r)
    if !authInfo.IsAuthenticated {
        ctx := context.WithValue(r.Context(), "loginPrompt", true)
        r = r.WithContext(ctx)

        RenderBrowse(w, r)
        return
    }

    params := models.SearchParams{}
    params.UserID = authInfo.UserID
    params.Name = r.URL.Query().Get("name")
    params.Tags = r.URL.Query()["tags"]

    shaders := data.GetRepository().SearchShaders(params)

    // Create browse page data for "My Shaders" - fix structure to match template
    data := models.BrowsePageData{
        Shaders:     shaders,
        AuthInfo:    authInfo,
        SearchQuery: params,
    }

    loadPage(w, "browse.html", data)
}

func RenderEditor(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]

    authInfo := getAuthInfo(r)
    
    var shader models.Shader
    var author string
    
    if id != "" && id != "new" {
        shaderID, err := strconv.Atoi(id)
        if err != nil {
            http.Error(w, "Invalid shader ID", http.StatusBadRequest)
            return
        }
        
        shaderPtr := data.GetRepository().GetShaderByID(shaderID)
        if shaderPtr != nil {
            shader = *shaderPtr
            user := data.GetRepository().GetUserByID(shader.UserID)
            if user != nil {
                author = user.Username
            }
        }
    }

    // Create editor page data using new types
    data := models.EditorPageData{
        AuthInfo: authInfo,
        Shader:   shader,
        Author:   author,
    }

    loadPage(w, "editor.html", data);
}
