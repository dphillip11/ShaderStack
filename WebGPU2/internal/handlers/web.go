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

var tmpl *template.Template

func InitTemplates() {
    tmpl, _ = template.ParseGlob("templates/{layouts,components}/*.html")
    for _, t := range tmpl.Templates() {
        log.Println("Loaded template:", t.Name())
    }
}

func loadPage(w http.ResponseWriter, pageFile string, templateToExecute string, data interface{}) {
    // Clone the base template so we can safely add page-specific definitions
    pageTemplate, err := baseTemplates.Clone()
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
    err = pageTemplate.ExecuteTemplate(w, templateToExecute, data)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        log.Printf("Execution error: %v", err)
    }
}

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

    loadPage(w, "browse.html", data);
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

func RenderSplitWindow(w http.ResponseWriter, r *http.Request) {    
    data := models.SplitWindowData{
        AuthInfo:      getAuthInfo(r),
        Vertical:     false,
        LeftContent:  template.HTML("<p>This is the left panel</p>"),
        RightContent: template.HTML("<p>This is the right panel</p>"),
    }


    loadPage(w, "split_window.html", data);
}
