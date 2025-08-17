package handlers

import (
    "html/template"
    "net/http"
    "strconv"
    "github.com/gorilla/mux"
    "go-server/internal/models"
    "go-server/internal/data"
)

const browsePath = "templates/browse.html"
const editorPath = "templates/editor.html"
const webpagePath = "templates/webpage.html"
const loginPath = "templates/login.html"
const shaderPropertiesPath = "templates/shader_properties.html"
const searchPath = "templates/search.html"


// Helper function to get authentication info from request
func getAuthInfo(r *http.Request) models.AuthenticationInfo {
    // Check for session cookie
    cookie, err := r.Cookie("session_token")
    if err != nil {
        return models.AuthenticationInfo{
            IsAuthenticated: false,
        }
    }

    // Use the session validation function from api.go
    session, exists := getSessionByToken(cookie.Value)
    if (!exists) {
        return models.AuthenticationInfo{
            IsAuthenticated: false,
        }
    }

    // Get user information
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
    
    // Parse templates
    tmpl, err := template.ParseFiles(webpagePath, browsePath, loginPath,searchPath)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Create browse page data using new types
    pageData := struct {
        Title string
        Page  string
        models.BrowsePageData
    }{
        Title: "Browse Shaders",
        Page:  "browse",
        BrowsePageData: models.BrowsePageData{
            Shaders:     shaders,
            AuthInfo:    authInfo,
            SearchQuery: params,
        },
    }

    if err := tmpl.Execute(w, pageData); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
}

func RenderMy(w http.ResponseWriter, r *http.Request) {
    authInfo := getAuthInfo(r)
    if !authInfo.IsAuthenticated {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    params := models.SearchParams{}
    params.UserID = authInfo.UserID
    params.Name = r.URL.Query().Get("name")
    params.Tags = r.URL.Query()["tags"]

    shaders := data.GetRepository().SearchShaders(params)
    
    // Parse templates
    tmpl, err := template.ParseFiles(webpagePath, browsePath, loginPath, searchPath)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Create browse page data for "My Shaders" - fix structure to match template
    pageData := struct {
        Title string
        Page  string
        models.BrowsePageData
    }{
        Title: "My Shaders",
        Page:  "my",
        BrowsePageData: models.BrowsePageData{
            Shaders:     shaders,
            AuthInfo:    authInfo,
            SearchQuery: params,
        },
    }

    if err := tmpl.Execute(w, pageData); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
}

func RenderEditor(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]

    authInfo := getAuthInfo(r)
    
    var shader models.Shader
    var author string
    title := "New Shader"
    
    if id != "" && id != "new" {
        shaderID, err := strconv.Atoi(id)
        if err != nil {
            http.Error(w, "Invalid shader ID", http.StatusBadRequest)
            return
        }
        
        shaderPtr := data.GetRepository().GetShaderByID(shaderID)
        if shaderPtr != nil {
            shader = *shaderPtr
            title = shader.Name
            user := data.GetRepository().GetUserByID(shader.UserID)
            if user != nil {
                author = user.Username
            }
        }
    }
    
    // Parse templates
    tmpl, err := template.ParseFiles(webpagePath, editorPath, loginPath, shaderPropertiesPath)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Create editor page data using new types
    pageData := struct {
        Title string
        Page  string
        models.EditorPageData
    }{
        Title: title,
        Page:  "editor",
        EditorPageData: models.EditorPageData{
            AuthInfo: authInfo,
            Shader:   shader,
            Author:   author,
        },
    }

    if err := tmpl.Execute(w, pageData); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
}