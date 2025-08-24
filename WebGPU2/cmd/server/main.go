package main

import (
    "fmt"
    "net/http"
    "github.com/gorilla/mux"
    "go-server/internal/handlers"
    "path/filepath"
    "os"
    "strconv"
    "time"
    "crypto/sha1"
    "io"
    "strings"
)

func main() {
    fmt.Println("Starting server...")
    
    r := mux.NewRouter()
    fmt.Println("Router created...")

    // Removed InitTemplates (SSR templates deprecated)

    // Authentication routes
    r.HandleFunc("/api/login", handlers.Login).Methods("POST")
    r.HandleFunc("/api/logout", handlers.Logout).Methods("POST")
    fmt.Println("Auth routes added...")

    // API routes for shaders - Fixed to match frontend expectations
    r.HandleFunc("/api/shaders", handlers.GetShaders).Methods("GET")
    r.HandleFunc("/api/shaders", handlers.BlockingAuthMiddleware(handlers.CreateShaderAPI)).Methods("POST")
    r.HandleFunc("/api/shaders/{id:[0-9]+}", handlers.GetShader).Methods("GET")
    r.HandleFunc("/api/shaders/{id:[0-9]+}", handlers.BlockingAuthMiddleware(handlers.UpdateShader)).Methods("PUT")
    r.HandleFunc("/api/shaders/{id:[0-9]+}", handlers.BlockingAuthMiddleware(handlers.DeleteShader)).Methods("DELETE")
    r.HandleFunc("/api/shaders/{id:[0-9]+}/properties", handlers.BlockingAuthMiddleware(handlers.UpdateShaderProperties)).Methods("PUT")
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
    r.HandleFunc("/{id:[0-9]+}", handlers.RenderEditor).Methods("GET")
    fmt.Println("Web routes added...")

    // Static file serving with caching
    r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", cacheFileServer("static")))
    fmt.Println("Static routes added...")

    http.Handle("/", r)
    fmt.Println("Server starting on :8080...")
    
    if err := http.ListenAndServe(":8080", nil); err != nil {
        fmt.Printf("Server failed to start: %v\n", err)
    }
}

func cacheFileServer(root string) http.Handler {
    fs := http.FileServer(http.Dir(root))
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Let directories list normally (or deny)
        path := filepath.Clean(r.URL.Path)
        full := filepath.Join(root, path)
        info, err := os.Stat(full)
        if err == nil && !info.IsDir() {
            // Basic ETag: size-modtime-sha1(optional small files)
            etag := `W/` + strconv.FormatInt(info.Size(), 10) + `-` + strconv.FormatInt(info.ModTime().Unix(), 10)
            if info.Size() <= 64*1024 { // hash only small files to avoid overhead
                if f, e := os.Open(full); e == nil {
                    h := sha1.New(); io.Copy(h, f); f.Close(); etag = `"` + etag + `-` + fmt.Sprintf("%x", h.Sum(nil)) + `"` }
            }
            w.Header().Set("ETag", etag)
            w.Header().Set("Last-Modified", info.ModTime().UTC().Format(http.TimeFormat))
            // Check conditional headers
            if match := r.Header.Get("If-None-Match"); match != "" && match == etag { w.WriteHeader(http.StatusNotModified); return }
            if ims := r.Header.Get("If-Modified-Since"); ims != "" {
                if t, e := time.Parse(http.TimeFormat, ims); e == nil && !info.ModTime().After(t) { w.WriteHeader(http.StatusNotModified); return }
            }
            // Cache-Control based on extension (avoid immutable for non-hashed dev assets)
            ext := filepath.Ext(path)
            name := filepath.Base(path)
            hashed := strings.Contains(name, ".") && strings.Count(name, ".") > 1 // crude: name like app.X.js
            long := map[string]bool{".wasm":true, ".png":true, ".jpg":true, ".jpeg":true, ".gif":true, ".svg":true, ".woff2":true}
            if long[ext] || (hashed && (ext == ".js" || ext == ".css")) {
                w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
            } else if ext == ".js" || ext == ".css" {
                w.Header().Set("Cache-Control", "public, max-age=0, must-revalidate")
            } else if ext == ".html" {
                w.Header().Set("Cache-Control", "no-cache")
            } else {
                w.Header().Set("Cache-Control", "public, max-age=3600")
            }
        }
        fs.ServeHTTP(w, r)
    })
}