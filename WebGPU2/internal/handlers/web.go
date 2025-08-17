package handlers

import (
    "html/template"
    "net/http"
    "strconv"
    "github.com/gorilla/mux"
    "go-server/internal/models"
    "go-server/internal/data"
    "bytes"
    "log"
)

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

    data := models.BrowsePageData{
        Shaders:     shaders,
        AuthInfo:    authInfo,
        SearchQuery: params,
    }

    tmpl , err := template.ParseFiles(
        "templates/layouts/base.html",
        "templates/components/login.html", 
        "templates/components/search.html",
        "templates/pages/browse.html",
    )
    if err != nil {
        http.Error(w, "Error loading templates", http.StatusInternalServerError)
        log.Printf("Template error: %v", err)
        return
    }

    if err := tmpl.Execute(w, data); err != nil {
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

    // Create browse page data for "My Shaders" - fix structure to match template
    data := models.BrowsePageData{
        Shaders:     shaders,
        AuthInfo:    authInfo,
        SearchQuery: params,
    }

    tmpl , err := template.ParseFiles(
        "templates/layouts/base.html",
        "templates/components/login.html", 
        "templates/components/search.html",
        "templates/pages/browse.html",
    )

    if err != nil {
        http.Error(w, "Error loading templates", http.StatusInternalServerError)
        log.Printf("Template error: %v", err)
        return
    }

    var buf bytes.Buffer
    err = tmpl.Execute(&buf, data)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    buf.WriteTo(w)
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

    tmpl , err := template.ParseFiles(
        "templates/layouts/base.html", 
        "templates/components/login.html",
        "templates/components/shader_properties.html",
        "templates/pages/editor.html")
        
    if err != nil {
        http.Error(w, "Error loading templates", http.StatusInternalServerError)
        log.Printf("Template error: %v", err)
        return
    }

    if err = tmpl.Execute(w, data); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
}

func RenderSplitWindow(w http.ResponseWriter, r *http.Request) {    
    data := models.SplitWindowData{
        AuthInfo:      getAuthInfo(r),
        Vertical:     false,
        LeftContent:  template.HTML("<p>This is the left panel</p>"),
        RightContent: template.HTML("<p>This is the right panel</p>"),
    }

    tmpl , err := template.ParseFiles("templates/layouts/base.html","templates/components/login.html",  "templates/pages/split_window.html")
    if err != nil {
        http.Error(w, "Error loading templates", http.StatusInternalServerError)
        log.Printf("Template error: %v", err)
        return
    }

    if err = tmpl.Execute(w, data); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
}
