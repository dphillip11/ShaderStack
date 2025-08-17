package main

import (
    "fmt"
    "net/http"
    "github.com/gorilla/mux"
    "go-server/internal/handlers"
)

func main() {
    fmt.Println("Starting server...")
    
    r := mux.NewRouter()
    fmt.Println("Router created...")

    handlers.InitTemplates()

    // Authentication routes
    r.HandleFunc("/api/login", handlers.Login).Methods("POST")
    r.HandleFunc("/api/logout", handlers.Logout).Methods("POST")
    fmt.Println("Auth routes added...")

    // API routes for shaders
    r.HandleFunc("/api/shaders", handlers.GetShaders).Methods("GET")
    r.HandleFunc("/api/shaders/{id:[0-9]+}", handlers.GetShader).Methods("GET")
    r.HandleFunc("/api/shaders/new", handlers.AuthMiddleware(handlers.CreateShaderAPI)).Methods("POST")
    r.HandleFunc("/api/shaders/{id:[0-9]+}", handlers.AuthMiddleware(handlers.UpdateShader)).Methods("PUT")
    r.HandleFunc("/api/shaders/{id:[0-9]+}", handlers.AuthMiddleware(handlers.DeleteShader)).Methods("DELETE")
    fmt.Println("API routes added...")

    // API routes for tags
    r.HandleFunc("/api/tags", handlers.GetTags).Methods("GET")
    
    // Favicon route to prevent 404 errors
    r.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusNoContent)
    }).Methods("GET")

    // Web routes - specific routes first, then general ones
    r.HandleFunc("/", handlers.RenderBrowse).Methods("GET")
    r.HandleFunc("/my", handlers.AuthMiddleware(handlers.RenderMy)).Methods("GET")
    r.HandleFunc("/new", handlers.RenderEditor).Methods("GET")
    r.HandleFunc("/sw", handlers.RenderSplitWindow).Methods("GET")
    r.HandleFunc("/{id:[0-9]+}", handlers.RenderEditor).Methods("GET")
    fmt.Println("Web routes added...")

    // Static file serving
    r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("static/"))))
    fmt.Println("Static routes added...")

    http.Handle("/", r)
    fmt.Println("Server starting on :8080...")
    
    if err := http.ListenAndServe(":8080", nil); err != nil {
        fmt.Printf("Server failed to start: %v\n", err)
    }
}