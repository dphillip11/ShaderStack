package handlers

import (
    "net/http"
    "os"
    "sync"
)

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

func RenderApp(w http.ResponseWriter, r *http.Request) {
    shellOnce.Do(loadShell)
    if shellErr != nil {
        http.Error(w, "Failed to load shell template", http.StatusInternalServerError)
        return
    }

    w.Write([]byte(shellHTML))
}